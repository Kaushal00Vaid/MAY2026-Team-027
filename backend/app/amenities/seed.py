from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.amenities.models import Amenity, AmenityBooking
from app.db.models.user import User

IST = ZoneInfo("Asia/Kolkata")

DEMO_AMENITIES = (
    (
        "Fitness Center",
        "Fully equipped cardio and strength training zones.",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
        30,
        time(6),
        time(21),
        60,
        5,
    ),
    (
        "Lap Pool",
        "25-meter temperature-controlled indoor pool.",
        "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=1470&auto=format&fit=crop",
        15,
        time(6),
        time(20),
        60,
        5,
    ),
    (
        "Tennis Court 1",
        "Championship-grade hard court. Booking required.",
        "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1472&auto=format&fit=crop",
        4,
        time(6),
        time(22),
        60,
        3,
    ),
    (
        "Clubhouse",
        "Indoor hall for private events and society meetings.",
        None,
        80,
        time(9),
        time(22),
        60,
        3,
    ),
)


def seed_amenities(db: Session, admin: User) -> None:
    schema = inspect(db.get_bind())
    missing = [
        table
        for table in ("amenities", "amenity_bookings")
        if not schema.has_table(table)
    ]
    if missing:
        raise RuntimeError(
            "Amenities database schema is not current (missing: "
            + ", ".join(missing)
            + "). Run 'alembic upgrade head'."
        )
    items = []
    for (
        name,
        description,
        image_url,
        capacity,
        opening,
        closing,
        minutes,
        limit,
    ) in DEMO_AMENITIES:
        item = db.scalar(select(Amenity).where(Amenity.name == name))
        if not item:
            item = Amenity(
                name=name,
                description=description,
                image_url=image_url,
                capacity=capacity,
                operating_start=opening,
                operating_end=closing,
                slot_minutes=minutes,
                weekly_limit=limit,
                created_by=admin.user_id,
            )
            db.add(item)
            db.flush()
        items.append(item)
    residents = list(
        db.scalars(
            select(User).where(User.flat_number.is_not(None)).order_by(User.user_id)
        ).all()
    )
    if not residents:
        raise RuntimeError("Amenities seed requires resident demo users.")
    tomorrow = datetime.now(IST).date() + timedelta(days=1)
    starts = datetime.combine(tomorrow, time(7), tzinfo=IST).astimezone(timezone.utc)
    marker = f"seed-amenity-{tomorrow}-{residents[0].user_id}"
    if not db.scalar(
        select(AmenityBooking).where(AmenityBooking.idempotency_key == marker)
    ):
        db.add(
            AmenityBooking(
                amenity_id=items[0].id,
                resident_id=residents[0].user_id,
                starts_at=starts,
                ends_at=starts + timedelta(hours=1),
                purpose="Fitness",
                idempotency_key=marker,
            )
        )
    db.commit()
    print("  [create] Amenities configuration and booking demo data ready.")
