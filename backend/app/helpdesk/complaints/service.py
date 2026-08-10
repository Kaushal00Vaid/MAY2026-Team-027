from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models.complaint import Complaint
from app.db.models.complaint_comment import ComplaintComment
from app.db.models.user import User
from app.realtime.service import add_notifications, user_ids_for_roles
from app.helpdesk.complaints.models import ComplaintStatusHistory
from app.helpdesk.complaints.permissions import ensure_can_create, ensure_operational, is_operational
from app.helpdesk.complaints.schemas import CommentCreate, ComplaintCreate, ComplaintUpdate
from app.helpdesk.work_orders.service import upsert_work_order


SLA_HOURS = {"Critical": 4, "High": 24, "Medium": 48, "Low": 72, "Normal": 48}
STATUS_TRANSITIONS = {
    # Direct resolution remains supported by the existing admin action; later
    # work-order flows can use the more detailed In Progress path.
    "Open": {"In Progress", "Resolved", "Closed"},
    "In Progress": {"Resolved", "Closed"},
    "Resolved": {"In Progress", "Closed"},
    "Closed": set(),
}


def _scoped_condition(user: User):
    if is_operational(user):
        return None
    roles = {assignment.role.role_name.value for assignment in user.roles}
    if "support_staff" in roles:
        return Complaint.assigned_to == user.user_id
    return Complaint.user_id == user.user_id


def complaint_location(user: User, requested_location: str | None) -> str | None:
    """Return the most specific available location without inventing one."""
    return requested_location or user.flat_number or user.building_block


def create_complaint(db: Session, user: User, data: ComplaintCreate) -> Complaint:
    ensure_can_create(user)
    priority = data.priority.value
    complaint = Complaint(
        user_id=user.user_id,
        title=data.title,
        category=data.category,
        description=data.description,
        # The resident form intentionally has no separate location input. Use
        # the registered flat as the ticket location unless a caller (such as
        # the admin form) supplies a more specific location.
        location=complaint_location(user, data.location),
        priority=priority,
        status="Open",
        latitude=data.latitude,
        longitude=data.longitude,
        sla_deadline=datetime.now(timezone.utc) + timedelta(hours=SLA_HOURS[priority]),
        version=1,
    )
    db.add(complaint)
    db.flush()
    db.add(
        ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=None,
            to_status="Open",
            changed_by=user.user_id,
            note="Complaint created",
        )
    )
    add_notifications(
        db,
        user_ids_for_roles(db, ["super_admin", "admin", "committee_member"]),
        event_type="complaint.created",
        title="New helpdesk complaint",
        message=complaint.title or complaint.category,
        resource_type="complaint",
        resource_id=complaint.id,
        payload={"scope": "helpdesk", "status": complaint.status},
    )
    db.commit()
    db.refresh(complaint)
    return complaint


def list_complaints(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    complaint_status: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> tuple[list[Complaint], int]:
    filters = []
    scope = _scoped_condition(user)
    if scope is not None:
        filters.append(scope)
    if complaint_status:
        filters.append(Complaint.status == complaint_status)
    if category:
        filters.append(func.lower(Complaint.category) == category.strip().lower())
    if priority:
        filters.append(Complaint.priority == priority)
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                Complaint.title.ilike(pattern),
                Complaint.category.ilike(pattern),
                Complaint.description.ilike(pattern),
                Complaint.location.ilike(pattern),
            )
        )

    sort_columns = {
        "created_at": Complaint.created_at,
        "updated_at": Complaint.updated_at,
        "priority": Complaint.priority,
    }
    sort_column = sort_columns[sort_by]
    ordering = sort_column.asc() if sort_order == "asc" else sort_column.desc()

    total = db.scalar(select(func.count(Complaint.id)).where(*filters)) or 0
    items = list(
        db.scalars(
            select(Complaint)
            .where(*filters)
            .order_by(ordering, Complaint.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return items, total


def get_complaint(db: Session, user: User, complaint_id: int) -> Complaint:
    filters = [Complaint.id == complaint_id]
    scope = _scoped_condition(user)
    if scope is not None:
        filters.append(scope)
    complaint = db.scalar(select(Complaint).where(*filters))
    if not complaint:
        # Do not reveal whether another resident's complaint exists.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    return complaint


def update_complaint(
    db: Session,
    user: User,
    complaint_id: int,
    data: ComplaintUpdate,
) -> Complaint:
    ensure_operational(user)
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    if complaint.version != data.expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Complaint was modified by another user. Refresh and retry.",
        )

    previous_status = complaint.status
    if data.status is not None:
        next_status = data.status.value
        if next_status != previous_status and next_status not in STATUS_TRANSITIONS[previous_status]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid complaint transition: {previous_status} -> {next_status}.",
            )
        complaint.status = next_status
    if data.assigned_to is not None:
        upsert_work_order(db, complaint, user, data.assigned_to, data.work_order_notes)
    if data.work_order_notes is not None:
        complaint.work_order_notes = data.work_order_notes.strip() or None

    changed = (
        complaint.status != previous_status
        or data.assigned_to is not None
        or data.work_order_notes is not None
    )
    if not changed:
        return complaint

    complaint.version += 1
    if complaint.status != previous_status:
        db.add(
            ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=previous_status,
                to_status=complaint.status,
                changed_by=user.user_id,
                note=data.status_note or (
                    "Work order assigned" if data.assigned_to is not None else None
                ),
            )
        )
    recipients = {complaint.user_id}
    if complaint.assigned_to:
        recipients.add(complaint.assigned_to)
    add_notifications(db, recipients, event_type="complaint.changed", title="Complaint updated", message=f"{complaint.title} is now {complaint.status}.", resource_type="complaint", resource_id=complaint.id, payload={"scope": "helpdesk", "status": complaint.status})
    db.commit()
    db.refresh(complaint)
    return complaint


def add_comment(
    db: Session, user: User, complaint_id: int, data: CommentCreate
) -> ComplaintComment:
    complaint = get_complaint(db, user, complaint_id)
    comment = ComplaintComment(
        complaint_id=complaint.id,
        user_id=user.user_id,
        body=data.body,
        is_internal=data.is_internal and is_operational(user),
    )
    db.add(comment)
    db.commit()
    return db.scalar(
        select(ComplaintComment)
        .options(joinedload(ComplaintComment.author))
        .where(ComplaintComment.id == comment.id)
    )


def list_comments(db: Session, user: User, complaint_id: int) -> list[ComplaintComment]:
    get_complaint(db, user, complaint_id)
    query = (
        select(ComplaintComment)
        .options(joinedload(ComplaintComment.author))
        .where(ComplaintComment.complaint_id == complaint_id)
    )
    if not is_operational(user):
        query = query.where(ComplaintComment.is_internal.is_(False))
    return list(
        db.scalars(
            query.order_by(ComplaintComment.created_at, ComplaintComment.id)
        ).all()
    )


def list_status_history(
    db: Session, user: User, complaint_id: int
) -> list[ComplaintStatusHistory]:
    get_complaint(db, user, complaint_id)
    return list(
        db.scalars(
            select(ComplaintStatusHistory)
            .where(ComplaintStatusHistory.complaint_id == complaint_id)
            .order_by(ComplaintStatusHistory.created_at, ComplaintStatusHistory.id)
        ).all()
    )


def escalate_complaint(
    db: Session, user: User, complaint_id: int, expected_version: int, note: str | None
) -> Complaint:
    ensure_operational(user)
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    if complaint.version != expected_version:
        raise HTTPException(status_code=409, detail="Complaint was modified. Refresh and retry.")
    if complaint.status in {"Resolved", "Closed"}:
        raise HTTPException(status_code=409, detail="Completed complaints cannot be escalated.")
    complaint.escalated_at = datetime.now(timezone.utc)
    complaint.version += 1
    db.add(
        ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=complaint.status,
            to_status=complaint.status,
            changed_by=user.user_id,
            note=note or "Escalated to committee",
        )
    )
    db.commit()
    db.refresh(complaint)
    return complaint
