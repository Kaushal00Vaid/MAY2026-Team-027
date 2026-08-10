import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db.models.complaint import Complaint
from app.db.models.role import Role, RoleName, UserRole
from app.db.models.user import User
from app.realtime.service import add_notifications
from app.helpdesk.attachments.validation import ALLOWED_MIME_TYPES, matches_declared_type
from app.helpdesk.complaints.models import ComplaintAttachment, ComplaintStatusHistory
from app.helpdesk.complaints.permissions import ensure_operational, is_operational
from app.helpdesk.work_orders.models import (
    KnownIssueSubscription,
    MaintenanceWorkOrder,
    StaffDutyState,
    WorkOrderResolutionPhoto,
)


DEFAULT_INSTRUCTIONS = {
    "Plumbing": ["Inspect and isolate the source", "Complete the repair", "Upload proof of work"],
    "Electrical": ["Make the area safe", "Diagnose and repair", "Upload proof of work"],
    "Lift / Elevator": ["Secure the lift area", "Run diagnostics", "Upload proof of work"],
}


def _roles(user: User) -> set[str]:
    return {item.role.role_name.value for item in user.roles}


def _ensure_support_staff(user: User) -> None:
    if RoleName.support_staff.value not in _roles(user):
        raise HTTPException(status_code=403, detail="Support staff access required.")


def _user_name(user: User | None) -> str:
    return f"{user.first_name} {user.last_name}" if user else "Unknown"


def work_order_response(order: MaintenanceWorkOrder) -> dict:
    complaint = order.complaint
    return {
        "id": order.id,
        "complaint_id": complaint.id,
        "complaint_version": complaint.version,
        "title": complaint.title or complaint.category,
        "description": complaint.description,
        "category": complaint.category,
        "location": complaint.location,
        "priority": complaint.priority,
        "status": order.status,
        "reporter_name": _user_name(complaint.user),
        "assigned_to": order.assigned_to,
        "assignee_name": _user_name(order.assignee),
        "instructions": order.instructions or [],
        "resolution_notes": order.resolution_notes,
        "sla_deadline": complaint.sla_deadline,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }


def list_assignees(db: Session, user: User) -> list[dict]:
    ensure_operational(user)
    staff = list(
        db.scalars(
            select(User)
            .join(UserRole, UserRole.user_id == User.user_id)
            .join(Role, Role.role_id == UserRole.role_id)
            .where(Role.role_name == RoleName.support_staff, User.is_active.is_(True))
            .order_by(User.first_name, User.last_name)
        ).all()
    )
    duty = {
        item.user_id: item.on_duty
        for item in db.scalars(select(StaffDutyState)).all()
    }
    return [
        {
            "user_id": item.user_id,
            "name": _user_name(item),
            "staff_type": item.staff_type,
            "on_duty": duty.get(item.user_id, True),
        }
        for item in staff
    ]


def upsert_work_order(
    db: Session, complaint: Complaint, actor: User, assignee_id: int, notes: str | None
) -> MaintenanceWorkOrder:
    staff = db.scalar(select(User).where(User.user_id == assignee_id, User.is_active.is_(True)))
    if not staff or RoleName.support_staff.value not in _roles(staff):
        raise HTTPException(status_code=422, detail="Assignee must be an active support staff user.")

    instructions = [line.strip(" -") for line in (notes or "").splitlines() if line.strip(" -")]
    if not instructions:
        instructions = DEFAULT_INSTRUCTIONS.get(
            complaint.category,
            ["Assess the reported issue", "Complete the required work", "Upload proof of work"],
        )
    order = db.scalar(
        select(MaintenanceWorkOrder)
        .where(MaintenanceWorkOrder.complaint_id == complaint.id)
        .with_for_update()
    )
    if order:
        if order.status == "Resolved":
            raise HTTPException(status_code=409, detail="Resolved work orders cannot be reassigned.")
        order.assigned_to = assignee_id
        order.assigned_by = actor.user_id
        order.instructions = instructions
        order.version += 1
    else:
        order = MaintenanceWorkOrder(
            complaint_id=complaint.id,
            assigned_to=assignee_id,
            assigned_by=actor.user_id,
            status="Assigned",
            instructions=instructions,
        )
        db.add(order)
    complaint.assigned_to = assignee_id
    if complaint.status == "Open":
        complaint.status = "In Progress"
    return order


def list_work_orders(db: Session, user: User, filter_by: str = "all") -> list[dict]:
    roles = _roles(user)
    if RoleName.support_staff.value not in roles and not is_operational(user):
        raise HTTPException(status_code=403, detail="Work-order access denied.")
    query = (
        select(MaintenanceWorkOrder)
        .options(
            joinedload(MaintenanceWorkOrder.complaint).joinedload(Complaint.user),
            joinedload(MaintenanceWorkOrder.assignee),
        )
        .where(MaintenanceWorkOrder.status != "Resolved")
    )
    if RoleName.support_staff.value in roles and not is_operational(user):
        query = query.where(MaintenanceWorkOrder.assigned_to == user.user_id)
    if filter_by == "urgent":
        query = query.join(Complaint).where(Complaint.priority.in_(["Critical", "High"]))
    elif filter_by in {"plumbing", "electrical"}:
        query = query.join(Complaint).where(func.lower(Complaint.category) == filter_by)
    orders = db.scalars(query.order_by(MaintenanceWorkOrder.created_at.desc())).unique().all()
    return [work_order_response(item) for item in orders]


def get_duty_state(db: Session, user: User) -> StaffDutyState:
    _ensure_support_staff(user)
    state = db.get(StaffDutyState, user.user_id)
    if not state:
        state = StaffDutyState(user_id=user.user_id, on_duty=True)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def set_duty_state(db: Session, user: User, on_duty: bool) -> StaffDutyState:
    state = get_duty_state(db, user)
    state.on_duty = on_duty
    db.commit()
    db.refresh(state)
    return state


def _save_resolution_photo(order_id: int, user_id: int, upload: UploadFile) -> tuple[WorkOrderResolutionPhoto, Path]:
    mime = (upload.content_type or "").lower()
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Resolution proof must be JPEG, PNG, or WebP.")
    content = upload.file.read(settings.HELPDESK_MAX_UPLOAD_BYTES + 1)
    if not content or len(content) > settings.HELPDESK_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Resolution photo is empty or exceeds 5 MB.")
    if not matches_declared_type(content, mime):
        raise HTTPException(status_code=415, detail="Photo content does not match its MIME type.")
    key = str(Path("helpdesk") / "work-orders" / str(order_id) / f"{uuid.uuid4().hex}{ALLOWED_MIME_TYPES[mime]}")
    root = Path(settings.MEDIA_ROOT).resolve()
    destination = (root / key).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as handle:
        handle.write(content)
    return (
        WorkOrderResolutionPhoto(
            work_order_id=order_id,
            uploaded_by=user_id,
            original_filename=Path(upload.filename or "resolution-photo").name[:255],
            storage_key=key,
            mime_type=mime,
            size_bytes=len(content),
        ),
        destination,
    )


def complete_work_order(
    db: Session, user: User, order_id: int, notes: str, upload: UploadFile
) -> dict:
    _ensure_support_staff(user)
    order = db.scalar(
        select(MaintenanceWorkOrder)
        .where(MaintenanceWorkOrder.id == order_id, MaintenanceWorkOrder.assigned_to == user.user_id)
        .with_for_update()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Assigned work order not found.")
    if order.status == "Resolved":
        raise HTTPException(status_code=409, detail="Work order is already resolved.")
    notes = notes.strip()
    if len(notes) < 3:
        raise HTTPException(status_code=422, detail="Resolution notes are required.")

    photo, path = _save_resolution_photo(order.id, user.user_id, upload)
    now = datetime.now(timezone.utc)
    try:
        order.status = "Resolved"
        order.resolution_notes = notes
        order.resolved_at = now
        order.version += 1
        complaint = order.complaint
        previous = complaint.status
        complaint.status = "Resolved"
        complaint.resolution_notes = notes
        complaint.resolved_at = now
        complaint.version += 1
        db.add(photo)
        db.add(
            ComplaintAttachment(
                complaint_id=complaint.id,
                uploaded_by=user.user_id,
                original_filename=photo.original_filename,
                storage_key=photo.storage_key,
                mime_type=photo.mime_type,
                size_bytes=photo.size_bytes,
            )
        )
        db.add(
            ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=previous,
                to_status="Resolved",
                changed_by=user.user_id,
                note=notes,
            )
        )
        add_notifications(db, [complaint.user_id], event_type="task.resolved", title="Complaint resolved", message=f"{complaint.title} has been resolved.", resource_type="complaint", resource_id=complaint.id, payload={"scope": "helpdesk", "status": "Resolved"})
        db.commit()
        db.refresh(order)
        return work_order_response(order)
    except Exception:
        db.rollback()
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass
        raise


def get_helpdesk_stats(db: Session, user: User) -> dict:
    ensure_operational(user)
    now = datetime.now(timezone.utc)
    active_statuses = ["Open", "In Progress"]
    active = db.scalar(select(func.count(Complaint.id)).where(Complaint.status.in_(active_statuses))) or 0
    unassigned = db.scalar(
        select(func.count(Complaint.id)).where(
            Complaint.status.in_(active_statuses), Complaint.assigned_to.is_(None)
        )
    ) or 0
    warning = db.scalar(
        select(func.count(Complaint.id)).where(
            Complaint.status.in_(active_statuses),
            Complaint.sla_deadline > now,
            Complaint.sla_deadline <= now + timedelta(hours=24),
        )
    ) or 0
    breached = db.scalar(
        select(func.count(Complaint.id)).where(
            Complaint.status.in_(active_statuses), Complaint.sla_deadline < now
        )
    ) or 0
    local_now = now.astimezone(ZoneInfo("Asia/Kolkata"))
    start_day = local_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(
        timezone.utc
    )
    resolved_today = db.scalar(
        select(func.count(Complaint.id)).where(Complaint.resolved_at >= start_day)
    ) or 0
    return {
        "active": active,
        "unassigned": unassigned,
        "sla_warning": warning,
        "breached": breached,
        "resolved_today": resolved_today,
    }


def list_known_issues(db: Session, user: User) -> list[dict]:
    active = list(
        db.scalars(
            select(Complaint)
            .where(Complaint.status.in_(["Open", "In Progress"]))
            .order_by(Complaint.created_at)
        ).all()
    )
    subscription_counts = dict(
        db.execute(
            select(KnownIssueSubscription.complaint_id, func.count(KnownIssueSubscription.id))
            .group_by(KnownIssueSubscription.complaint_id)
        ).all()
    )
    subscribed_ids = set(
        db.scalars(
            select(KnownIssueSubscription.complaint_id).where(
                KnownIssueSubscription.user_id == user.user_id
            )
        ).all()
    )
    grouped: dict[tuple[str, str], list[Complaint]] = {}
    for item in active:
        grouped.setdefault((item.category.lower(), (item.location or "Common area").lower()), []).append(item)
    result = []
    for records in grouped.values():
        representative = records[0]
        result.append(
            {
                "complaint_id": representative.id,
                "title": representative.title or representative.category,
                "category": representative.category,
                "location": representative.location,
                "status": representative.status,
                "report_count": len(records),
                "subscriber_count": subscription_counts.get(representative.id, 0),
                "created_at": representative.created_at,
                "subscribed": representative.id in subscribed_ids,
            }
        )
    return result


def subscribe_known_issue(db: Session, user: User, complaint_id: int) -> dict:
    complaint = db.scalar(
        select(Complaint).where(
            Complaint.id == complaint_id, Complaint.status.in_(["Open", "In Progress"])
        )
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Known issue not found.")
    existing = db.scalar(
        select(KnownIssueSubscription).where(
            KnownIssueSubscription.complaint_id == complaint_id,
            KnownIssueSubscription.user_id == user.user_id,
        )
    )
    if not existing:
        db.add(KnownIssueSubscription(complaint_id=complaint_id, user_id=user.user_id))
        db.commit()
    return next(item for item in list_known_issues(db, user) if item["complaint_id"] == complaint_id)


def analyze_message(db: Session, user: User, message: str) -> dict:
    lowered = message.lower()
    keywords = {
        "Plumbing": ["water", "leak", "pipe", "drain"],
        "Electrical": ["light", "power", "electric", "socket"],
        "Lift / Elevator": ["lift", "elevator"],
        "Billing": ["bill", "invoice", "payment"],
        "Noise": ["noise", "music", "loud"],
    }
    category = next(
        (name for name, words in keywords.items() if any(word in lowered for word in words)),
        "Maintenance",
    )
    issues = list_known_issues(db, user)
    match = next((item for item in issues if item["category"].lower() == category.lower()), None)
    if match:
        response = "A compatible open issue already exists. You can subscribe to its updates or create a separate ticket."
    else:
        response = f"I classified this as {category}. Use New Ticket to submit it to the helpdesk team."
    return {"message": response, "suggested_category": category, "known_issue": match}
