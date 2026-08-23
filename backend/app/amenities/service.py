from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.amenities.models import Amenity, AmenityBooking
from app.amenities.permissions import (
    ensure_member,
    ensure_operational,
    ensure_resident,
    is_operational,
)
from app.db.models.user import User
from app.realtime.service import add_notifications, user_ids_for_roles

IST = ZoneInfo("Asia/Kolkata")


def _amenity_dict(item: Amenity) -> dict:
    return {
        key: getattr(item, key)
        for key in (
            "id",
            "name",
            "description",
            "image_url",
            "capacity",
            "operating_start",
            "operating_end",
            "slot_minutes",
            "weekly_limit",
            "is_active",
        )
    }


def _booking_dict(db: Session, item: AmenityBooking) -> dict:
    amenity = db.get(Amenity, item.amenity_id)
    resident = db.get(User, item.resident_id)
    return {
        "id": item.id,
        "amenity_id": item.amenity_id,
        "amenity_name": amenity.name,
        "resident_id": item.resident_id,
        "resident_name": f"{resident.first_name} {resident.last_name}",
        "unit": resident.flat_number,
        "starts_at": item.starts_at,
        "ends_at": item.ends_at,
        "purpose": item.purpose,
        "status": item.status,
        "created_at": item.created_at,
    }


def list_amenities(
    db: Session, user: User, include_inactive: bool = False
) -> list[dict]:
    ensure_member(user)
    query = select(Amenity).order_by(Amenity.name)
    if not (include_inactive and is_operational(user)):
        query = query.where(Amenity.is_active.is_(True))
    return [_amenity_dict(item) for item in db.scalars(query).all()]


def create_amenity(db: Session, user: User, data) -> dict:
    ensure_operational(user)
    if data.operating_start >= data.operating_end:
        raise HTTPException(
            status_code=422, detail="Operating end must be after operating start."
        )
    if db.scalar(
        select(Amenity.id).where(func.lower(Amenity.name) == data.name.casefold())
    ):
        raise HTTPException(
            status_code=409, detail="An amenity with this name already exists."
        )
    item = Amenity(**data.model_dump(), created_by=user.user_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _amenity_dict(item)


def update_amenity(db: Session, user: User, amenity_id: int, data) -> dict:
    ensure_operational(user)
    item = db.get(Amenity, amenity_id)
    if not item:
        raise HTTPException(status_code=404, detail="Amenity not found.")
    changes = data.model_dump(exclude_unset=True)
    schedule_changes = {
        "operating_start",
        "operating_end",
        "slot_minutes",
    } & changes.keys()
    requires_clear_schedule = (
        changes.get("is_active") is False and item.is_active
    ) or any(changes[key] != getattr(item, key) for key in schedule_changes)
    if requires_clear_schedule:
        upcoming = (
            db.scalar(
                select(func.count(AmenityBooking.id)).where(
                    AmenityBooking.amenity_id == item.id,
                    AmenityBooking.status == "confirmed",
                    AmenityBooking.starts_at > datetime.now(timezone.utc),
                )
            )
            or 0
        )
        if upcoming:
            action = (
                "deactivating this amenity"
                if changes.get("is_active") is False and item.is_active
                else "changing its schedule"
            )
            raise HTTPException(
                status_code=409,
                detail=f"Cancel upcoming bookings before {action}.",
            )
    for key, value in changes.items():
        setattr(item, key, value)
    if item.operating_start >= item.operating_end:
        raise HTTPException(
            status_code=422, detail="Operating end must be after operating start."
        )
    db.commit()
    db.refresh(item)
    return _amenity_dict(item)


def _local_datetime(day: date, at: time) -> datetime:
    return datetime.combine(day, at, tzinfo=IST)


def _week_bounds(local_day: date) -> tuple[datetime, datetime]:
    # UI quota resets at Sunday midnight.
    sunday = local_day - timedelta(days=(local_day.weekday() + 1) % 7)
    start = datetime.combine(sunday, time.min, tzinfo=IST).astimezone(timezone.utc)
    return start, start + timedelta(days=7)


def _flat_resident_ids(db: Session, user: User) -> list[int]:
    if not user.flat_number:
        return [user.user_id]
    return list(
        db.scalars(
            select(User.user_id).where(User.flat_number == user.flat_number)
        ).all()
    )


def _complete_elapsed(db: Session, amenity_id: int | None = None) -> None:
    query = select(AmenityBooking).where(
        AmenityBooking.status == "confirmed",
        AmenityBooking.ends_at <= datetime.now(timezone.utc),
    )
    if amenity_id is not None:
        query = query.where(AmenityBooking.amenity_id == amenity_id)
    changed = False
    for item in db.scalars(query).all():
        item.status = "completed"
        changed = True
    if changed:
        db.commit()


def availability(
    db: Session, user: User, amenity_id: int, start_date: date, days: int
) -> dict:
    ensure_member(user)
    _complete_elapsed(db, amenity_id)
    amenity = db.get(Amenity, amenity_id)
    if not amenity or (not amenity.is_active and not is_operational(user)):
        raise HTTPException(status_code=404, detail="Amenity not found.")
    range_start = _local_datetime(start_date, amenity.operating_start).astimezone(
        timezone.utc
    )
    range_end = _local_datetime(
        start_date + timedelta(days=days), amenity.operating_end
    ).astimezone(timezone.utc)
    bookings = list(
        db.scalars(
            select(AmenityBooking).where(
                AmenityBooking.amenity_id == amenity.id,
                AmenityBooking.status == "confirmed",
                AmenityBooking.starts_at < range_end,
                AmenityBooking.ends_at > range_start,
            )
        ).all()
    )
    slots = []
    now = datetime.now(timezone.utc)
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        cursor = _local_datetime(day, amenity.operating_start).astimezone(timezone.utc)
        close = _local_datetime(day, amenity.operating_end).astimezone(timezone.utc)
        while cursor + timedelta(minutes=amenity.slot_minutes) <= close:
            end = cursor + timedelta(minutes=amenity.slot_minutes)
            collision = next(
                (
                    item
                    for item in bookings
                    if item.starts_at < end and item.ends_at > cursor
                ),
                None,
            )
            visible = collision and (
                is_operational(user) or collision.resident_id == user.user_id
            )
            slots.append(
                {
                    "starts_at": cursor,
                    "ends_at": end,
                    "available": amenity.is_active
                    and cursor > now
                    and collision is None,
                    "booking": _booking_dict(db, collision) if visible else None,
                }
            )
            cursor = end
    week_start, week_end = _week_bounds(start_date)
    used = 0
    if not is_operational(user):
        used = (
            db.scalar(
                select(func.count(AmenityBooking.id)).where(
                    AmenityBooking.amenity_id == amenity.id,
                    AmenityBooking.resident_id.in_(_flat_resident_ids(db, user)),
                    AmenityBooking.status.in_(("confirmed", "completed")),
                    AmenityBooking.starts_at >= week_start,
                    AmenityBooking.starts_at < week_end,
                )
            )
            or 0
        )
    return {
        "amenity": _amenity_dict(amenity),
        "start_date": start_date,
        "days": days,
        "slots": slots,
        "weekly_used": used,
        "weekly_limit": amenity.weekly_limit,
    }


def create_booking(db: Session, user: User, data, key: str) -> dict:
    ensure_resident(user)
    db.execute(select(func.pg_advisory_xact_lock(func.hashtext(f"amenity-key:{key}"))))
    old = db.scalar(select(AmenityBooking).where(AmenityBooking.idempotency_key == key))
    if old:
        if (
            old.amenity_id != data.amenity_id
            or old.starts_at != data.starts_at
            or old.purpose != data.purpose
        ):
            raise HTTPException(
                status_code=409,
                detail="Idempotency-Key was already used with a different request.",
            )
        return _booking_dict(db, old)
    amenity = db.get(Amenity, data.amenity_id)
    if not amenity or not amenity.is_active:
        raise HTTPException(status_code=404, detail="Amenity not found.")
    if data.starts_at.tzinfo is None:
        raise HTTPException(
            status_code=422, detail="Booking time must include a timezone."
        )
    start = data.starts_at.astimezone(timezone.utc)
    if start <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Bookings must be in the future.")
    if start > datetime.now(timezone.utc) + timedelta(days=90):
        raise HTTPException(
            status_code=422, detail="Bookings can be made at most 90 days ahead."
        )
    local = start.astimezone(IST)
    opening = _local_datetime(local.date(), amenity.operating_start)
    closing = _local_datetime(local.date(), amenity.operating_end)
    end_local = local + timedelta(minutes=amenity.slot_minutes)
    offset_minutes = int((local - opening).total_seconds() // 60)
    if local < opening or end_local > closing or offset_minutes % amenity.slot_minutes:
        raise HTTPException(
            status_code=422, detail="Select a valid slot within operating hours."
        )
    week_start, week_end = _week_bounds(local.date())
    flat_key = user.flat_number or str(user.user_id)
    db.execute(
        select(
            func.pg_advisory_xact_lock(
                func.hashtext(
                    f"amenity-quota:{amenity.id}:{flat_key}:{week_start.date()}"
                )
            )
        )
    )
    used = (
        db.scalar(
            select(func.count(AmenityBooking.id)).where(
                AmenityBooking.amenity_id == amenity.id,
                AmenityBooking.resident_id.in_(_flat_resident_ids(db, user)),
                AmenityBooking.status.in_(("confirmed", "completed")),
                AmenityBooking.starts_at >= week_start,
                AmenityBooking.starts_at < week_end,
            )
        )
        or 0
    )
    if used >= amenity.weekly_limit:
        raise HTTPException(
            status_code=409, detail="Weekly household booking limit reached."
        )
    item = AmenityBooking(
        amenity_id=amenity.id,
        resident_id=user.user_id,
        starts_at=start,
        ends_at=start + timedelta(minutes=amenity.slot_minutes),
        purpose=data.purpose,
        idempotency_key=key,
    )
    db.add(item)
    db.flush()
    add_notifications(
        db,
        {user.user_id}
        | user_ids_for_roles(db, ["super_admin", "admin", "committee_member"]),
        event_type="booking.created",
        title="Amenity booking confirmed",
        message=f"{amenity.name} has been booked for {local:%d %b, %I:%M %p}.",
        resource_type="booking",
        resource_id=item.id,
        payload={"scope": "amenities", "status": "confirmed"},
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "excl_confirmed_amenity_booking_overlap" in str(exc.orig):
            raise HTTPException(
                status_code=409,
                detail="This slot was just booked. Choose another slot.",
            ) from exc
        raise
    db.refresh(item)
    return _booking_dict(db, item)


def list_bookings(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    start_date: date | None = None,
    end_date: date | None = None,
    amenity_id: int | None = None,
) -> tuple[list[dict], int]:
    ensure_member(user)
    _complete_elapsed(db)
    criteria = []
    if not is_operational(user):
        criteria.append(AmenityBooking.resident_id == user.user_id)
    if start_date:
        criteria.append(
            AmenityBooking.starts_at
            >= datetime.combine(start_date, time.min, tzinfo=IST).astimezone(
                timezone.utc
            )
        )
    if end_date:
        criteria.append(
            AmenityBooking.starts_at
            < datetime.combine(end_date, time.min, tzinfo=IST).astimezone(timezone.utc)
        )
    if start_date and end_date and end_date <= start_date:
        raise HTTPException(
            status_code=422, detail="End date must be after start date."
        )
    if amenity_id:
        criteria.append(AmenityBooking.amenity_id == amenity_id)
    query = select(AmenityBooking).where(*criteria)
    total = db.scalar(select(func.count(AmenityBooking.id)).where(*criteria)) or 0
    items = db.scalars(
        query.order_by(AmenityBooking.starts_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [_booking_dict(db, item) for item in items], total


def cancel_booking(db: Session, user: User, booking_id: int) -> dict:
    ensure_member(user)
    item = db.scalar(
        select(AmenityBooking).where(AmenityBooking.id == booking_id).with_for_update()
    )
    if not item or (not is_operational(user) and item.resident_id != user.user_id):
        raise HTTPException(status_code=404, detail="Booking not found.")
    if item.status != "confirmed":
        raise HTTPException(
            status_code=409, detail="Only confirmed bookings can be cancelled."
        )
    if item.starts_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=409, detail="A started booking cannot be cancelled."
        )
    item.status = "cancelled"
    item.cancelled_at = datetime.now(timezone.utc)
    item.cancelled_by = user.user_id
    amenity = db.get(Amenity, item.amenity_id)
    add_notifications(
        db,
        {item.resident_id}
        | user_ids_for_roles(db, ["super_admin", "admin", "committee_member"]),
        event_type="booking.cancelled",
        title="Amenity booking cancelled",
        message=f"The {amenity.name if amenity else 'amenity'} booking was cancelled.",
        resource_type="booking",
        resource_id=item.id,
        payload={"scope": "amenities", "status": "cancelled"},
    )
    db.commit()
    db.refresh(item)
    return _booking_dict(db, item)
