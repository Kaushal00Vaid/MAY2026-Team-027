from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.community.models import (
    CommunityEvent,
    DiscussionLike,
    DiscussionReply,
    DiscussionThread,
    EventRsvp,
    Notice,
    NoticeDelivery,
    Poll,
    PollOption,
    PollVote,
    VolunteerOpportunity,
    VolunteerSignup,
)
from app.community.permissions import ensure_community_member, ensure_operational, is_operational
from app.community.schemas import NoticeCreate, PollCreate
from app.db.models.role import Role, RoleName, UserRole
from app.db.models.user import User
from app.realtime.service import add_notifications


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    """SQLite drops tzinfo; persisted application timestamps are stored in UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _notice_dict(notice: Notice, is_read: bool = False) -> dict:
    labels = {"all": "All Blocks", "block": f"Block {notice.target_value}", "flat": notice.target_value}
    return {
        "id": notice.id,
        "title": notice.title,
        "body": notice.body,
        "target_type": notice.target_type,
        "target_value": notice.target_value,
        "target_label": labels[notice.target_type],
        "published_at": notice.published_at,
        "expires_at": notice.expires_at,
        "is_read": is_read,
    }


def _notice_filters(user: User) -> list:
    filters = [
        Notice.is_active.is_(True),
        or_(Notice.expires_at.is_(None), Notice.expires_at > _now()),
    ]
    if not is_operational(user):
        filters.append(
            or_(
                Notice.target_type == "all",
                and_(
                    Notice.target_type == "block",
                    func.lower(Notice.target_value)
                    == (user.building_block or "").lower(),
                ),
                and_(
                    Notice.target_type == "flat",
                    func.lower(Notice.target_value)
                    == (user.flat_number or "").lower(),
                ),
            )
        )
    return filters


def create_notice(db: Session, user: User, data: NoticeCreate) -> dict:
    ensure_operational(user)
    if data.expires_at and _as_utc(data.expires_at) <= _now():
        raise HTTPException(status_code=422, detail="Notice expiry must be in the future.")
    recipients_query = (
        select(User)
        .join(UserRole, UserRole.user_id == User.user_id)
        .join(Role, Role.role_id == UserRole.role_id)
        .where(
            Role.role_name.in_([RoleName.flat_owner, RoleName.resident_rental]),
            User.is_active.is_(True),
        )
    )
    if data.target_type == "block":
        recipients_query = recipients_query.where(
            func.lower(User.building_block) == data.target_value.lower()
        )
    elif data.target_type == "flat":
        recipients_query = recipients_query.where(
            func.lower(User.flat_number) == data.target_value.lower()
        )
    recipients = db.scalars(recipients_query).unique().all()
    if data.target_type != "all" and not recipients:
        raise HTTPException(
            status_code=422,
            detail="No active residents match the selected notice target.",
        )
    notice = Notice(**data.model_dump(), created_by=user.user_id)
    db.add(notice)
    db.flush()
    db.add_all(
        NoticeDelivery(notice_id=notice.id, user_id=recipient.user_id)
        for recipient in recipients
    )
    add_notifications(
        db,
        (recipient.user_id for recipient in recipients),
        event_type="notification.delivery",
        title=notice.title,
        message=notice.body,
        resource_type="notice",
        resource_id=notice.id,
        payload={"scope": "community", "target_type": notice.target_type},
    )
    db.commit()
    db.refresh(notice)
    return _notice_dict(notice)


def list_notices(db: Session, user: User, page: int, page_size: int) -> tuple[list[dict], int]:
    ensure_community_member(user)
    filters = _notice_filters(user)
    total = db.scalar(select(func.count(Notice.id)).where(*filters)) or 0
    notices = list(db.scalars(select(Notice).where(*filters).order_by(Notice.published_at.desc()).offset((page - 1) * page_size).limit(page_size)).all())
    read_ids = set(db.scalars(select(NoticeDelivery.notice_id).where(NoticeDelivery.user_id == user.user_id, NoticeDelivery.read_at.is_not(None))).all())
    return [_notice_dict(item, item.id in read_ids) for item in notices], total


def mark_notice_read(db: Session, user: User, notice_id: int) -> dict:
    ensure_community_member(user)
    notice = db.scalar(
        select(Notice).where(Notice.id == notice_id, *_notice_filters(user))
    )
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    delivery = db.scalar(select(NoticeDelivery).where(NoticeDelivery.notice_id == notice_id, NoticeDelivery.user_id == user.user_id))
    if not delivery:
        delivery = NoticeDelivery(notice_id=notice_id, user_id=user.user_id)
        db.add(delivery)
    delivery.read_at = _now()
    db.commit()
    return _notice_dict(notice, True)


def list_events(db: Session, user: User) -> list[dict]:
    ensure_community_member(user)
    events = list(db.scalars(select(CommunityEvent).where(CommunityEvent.is_active.is_(True), CommunityEvent.ends_at > _now()).order_by(CommunityEvent.starts_at)).all())
    counts = dict(db.execute(select(EventRsvp.event_id, func.count(EventRsvp.id)).where(EventRsvp.status == "going").group_by(EventRsvp.event_id)).all())
    mine = dict(db.execute(select(EventRsvp.event_id, EventRsvp.status).where(EventRsvp.user_id == user.user_id)).all())
    return [{"id": item.id, "title": item.title, "description": item.description, "location": item.location, "starts_at": item.starts_at, "ends_at": item.ends_at, "capacity": item.capacity, "going_count": counts.get(item.id, 0), "my_status": mine.get(item.id)} for item in events]


def rsvp_event(db: Session, user: User, event_id: int, status: str) -> dict:
    ensure_community_member(user)
    event = db.scalar(select(CommunityEvent).where(CommunityEvent.id == event_id, CommunityEvent.is_active.is_(True)).with_for_update())
    if not event or _as_utc(event.ends_at) <= _now():
        raise HTTPException(status_code=404, detail="Upcoming event not found.")
    rsvp = db.scalar(select(EventRsvp).where(EventRsvp.event_id == event_id, EventRsvp.user_id == user.user_id))
    if status == "going" and event.capacity:
        going = db.scalar(select(func.count(EventRsvp.id)).where(EventRsvp.event_id == event_id, EventRsvp.status == "going")) or 0
        if going >= event.capacity and (not rsvp or rsvp.status != "going"):
            raise HTTPException(status_code=409, detail="This event is full.")
    if rsvp:
        rsvp.status = status
        rsvp.updated_at = _now()
    else:
        db.add(EventRsvp(event_id=event_id, user_id=user.user_id, status=status))
    db.commit()
    return next(item for item in list_events(db, user) if item["id"] == event_id)


def list_volunteers(db: Session, user: User) -> list[dict]:
    ensure_community_member(user)
    items = list(db.scalars(select(VolunteerOpportunity).where(VolunteerOpportunity.is_active.is_(True), or_(VolunteerOpportunity.closes_at.is_(None), VolunteerOpportunity.closes_at > _now())).order_by(VolunteerOpportunity.created_at.desc())).all())
    counts = dict(db.execute(select(VolunteerSignup.opportunity_id, func.count(VolunteerSignup.id)).group_by(VolunteerSignup.opportunity_id)).all())
    mine = set(db.scalars(select(VolunteerSignup.opportunity_id).where(VolunteerSignup.user_id == user.user_id)).all())
    return [{"id": item.id, "title": item.title, "description": item.description, "volunteers_needed": item.volunteers_needed, "signup_count": counts.get(item.id, 0), "spots_remaining": max(0, item.volunteers_needed - counts.get(item.id, 0)), "closes_at": item.closes_at, "signed_up": item.id in mine} for item in items]


def signup_volunteer(db: Session, user: User, opportunity_id: int) -> dict:
    ensure_community_member(user)
    item = db.scalar(select(VolunteerOpportunity).where(VolunteerOpportunity.id == opportunity_id, VolunteerOpportunity.is_active.is_(True)).with_for_update())
    if not item or (item.closes_at and _as_utc(item.closes_at) <= _now()):
        raise HTTPException(status_code=404, detail="Volunteer opportunity not found.")
    existing = db.scalar(select(VolunteerSignup).where(VolunteerSignup.opportunity_id == opportunity_id, VolunteerSignup.user_id == user.user_id))
    count = db.scalar(select(func.count(VolunteerSignup.id)).where(VolunteerSignup.opportunity_id == opportunity_id)) or 0
    if not existing and count >= item.volunteers_needed:
        raise HTTPException(status_code=409, detail="All volunteer positions are filled.")
    if not existing:
        db.add(VolunteerSignup(opportunity_id=opportunity_id, user_id=user.user_id))
        db.commit()
    return next(value for value in list_volunteers(db, user) if value["id"] == opportunity_id)


def withdraw_volunteer(db: Session, user: User, opportunity_id: int) -> dict:
    ensure_community_member(user)
    item = db.scalar(
        select(VolunteerOpportunity)
        .where(
            VolunteerOpportunity.id == opportunity_id,
            VolunteerOpportunity.is_active.is_(True),
        )
        .with_for_update()
    )
    if not item or (item.closes_at and _as_utc(item.closes_at) <= _now()):
        raise HTTPException(status_code=404, detail="Volunteer opportunity not found.")
    signup = db.scalar(select(VolunteerSignup).where(VolunteerSignup.opportunity_id == opportunity_id, VolunteerSignup.user_id == user.user_id))
    if signup:
        db.delete(signup)
        db.commit()
    items = list_volunteers(db, user)
    try:
        return next(value for value in items if value["id"] == opportunity_id)
    except StopIteration as exc:
        raise HTTPException(status_code=404, detail="Volunteer opportunity not found.") from exc


def active_poll(db: Session, user: User) -> dict | None:
    ensure_community_member(user)
    now = _now()
    polls = db.scalars(
        select(Poll).where(Poll.is_active.is_(True)).order_by(Poll.ends_at)
    ).all()
    poll = next(
        (item for item in polls if _as_utc(item.starts_at) <= now < _as_utc(item.ends_at)),
        None,
    )
    if not poll:
        return None
    options = list(db.scalars(select(PollOption).where(PollOption.poll_id == poll.id).order_by(PollOption.display_order, PollOption.id)).all())
    counts = dict(db.execute(select(PollVote.option_id, func.count(PollVote.id)).where(PollVote.poll_id == poll.id).group_by(PollVote.option_id)).all())
    total = sum(counts.values())
    selected = db.scalar(select(PollVote.option_id).where(PollVote.poll_id == poll.id, PollVote.user_id == user.user_id))
    return {"id": poll.id, "question": poll.question, "description": poll.description, "ends_at": poll.ends_at, "total_votes": total, "selected_option_id": selected, "options": [{"id": option.id, "label": option.label, "votes": counts.get(option.id, 0), "percentage": round(counts.get(option.id, 0) * 100 / total) if total else 0} for option in options]}


def create_poll(db: Session, user: User, data: PollCreate) -> dict:
    ensure_operational(user)
    now = _now()
    if data.ends_at <= now:
        raise HTTPException(status_code=422, detail="Poll end time must be in the future.")
    for existing in db.scalars(select(Poll).where(Poll.is_active.is_(True)).with_for_update()):
        if _as_utc(existing.starts_at) <= now < _as_utc(existing.ends_at):
            existing.is_active = False
    poll = Poll(
        question=data.question,
        description=data.description,
        starts_at=now,
        ends_at=data.ends_at,
        created_by=user.user_id,
    )
    db.add(poll)
    db.flush()
    db.add_all(
        PollOption(poll_id=poll.id, label=label, display_order=index)
        for index, label in enumerate(data.options, 1)
    )
    db.commit()
    return active_poll(db, user)


def vote(db: Session, user: User, poll_id: int, option_id: int) -> dict:
    ensure_community_member(user)
    poll = db.scalar(select(Poll).where(Poll.id == poll_id).with_for_update())
    if not poll or not poll.is_active or _as_utc(poll.starts_at) > _now() or _as_utc(poll.ends_at) <= _now():
        raise HTTPException(status_code=409, detail="This poll is not accepting votes.")
    if db.scalar(select(PollVote.id).where(PollVote.poll_id == poll_id, PollVote.user_id == user.user_id)):
        raise HTTPException(status_code=409, detail="Poll votes are final and cannot be changed.")
    if not db.scalar(select(PollOption.id).where(PollOption.id == option_id, PollOption.poll_id == poll_id)):
        raise HTTPException(status_code=422, detail="The selected option does not belong to this poll.")
    db.add(PollVote(poll_id=poll_id, option_id=option_id, user_id=user.user_id))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Poll votes are final and cannot be changed.") from exc
    return active_poll(db, user)


def list_discussions(db: Session, user: User, page: int, page_size: int) -> tuple[list[dict], int]:
    ensure_community_member(user)
    total = db.scalar(select(func.count(DiscussionThread.id)).where(DiscussionThread.is_active.is_(True))) or 0
    reply_counts = (
        select(
            DiscussionReply.thread_id,
            func.count(DiscussionReply.id).label("reply_count"),
        )
        .group_by(DiscussionReply.thread_id)
        .subquery()
    )
    like_counts = (
        select(
            DiscussionLike.thread_id,
            func.count(DiscussionLike.id).label("like_count"),
        )
        .group_by(DiscussionLike.thread_id)
        .subquery()
    )
    rows = db.execute(
        select(
            DiscussionThread,
            User.first_name,
            User.last_name,
            User.flat_number,
            func.coalesce(reply_counts.c.reply_count, 0),
            func.coalesce(like_counts.c.like_count, 0),
        )
        .outerjoin(User, User.user_id == DiscussionThread.created_by)
        .outerjoin(reply_counts, reply_counts.c.thread_id == DiscussionThread.id)
        .outerjoin(like_counts, like_counts.c.thread_id == DiscussionThread.id)
        .where(DiscussionThread.is_active.is_(True))
        .order_by(DiscussionThread.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "body": item.body,
            "tag": item.tag,
            "author": (
                f"{first_name} {last_name}"
                if first_name is not None
                else "Former resident"
            ),
            "author_flat": flat_number,
            "reply_count": reply_count,
            "like_count": like_count,
            "created_at": item.created_at,
        }
        for item, first_name, last_name, flat_number, reply_count, like_count in rows
    ], total


def directory(db: Session, user: User, search: str | None, page: int, page_size: int) -> tuple[list[dict], int]:
    ensure_operational(user)
    resident_roles = [RoleName.flat_owner, RoleName.resident_rental]
    filters = [Role.role_name.in_(resident_roles)]
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(or_(User.first_name.ilike(pattern), User.last_name.ilike(pattern), User.flat_number.ilike(pattern)))
    base = select(User).join(UserRole, UserRole.user_id == User.user_id).join(Role, Role.role_id == UserRole.role_id).where(*filters)
    total = db.scalar(select(func.count(func.distinct(User.user_id))).select_from(User).join(UserRole, UserRole.user_id == User.user_id).join(Role, Role.role_id == UserRole.role_id).where(*filters)) or 0
    users = list(
        db.scalars(
            base.options(selectinload(User.roles).selectinload(UserRole.role))
            .order_by(User.first_name, User.last_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .unique()
        .all()
    )
    result = []
    for item in users:
        role_names = {assignment.role.role_name for assignment in item.roles}
        role = "Owner" if RoleName.flat_owner in role_names else "Tenant"
        result.append({"user_id": item.user_id, "name": f"{item.first_name} {item.last_name}", "unit": item.flat_number, "role": role, "status": "Active" if item.is_active else "Inactive", "joined_at": item.created_at})
    return result, total
