from sqlalchemy.orm import Session
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.db.models.complaint import Complaint
from app.db.models.complaint_comment import ComplaintComment
from app.helpdesk.schemas import ComplaintCreate, ComplaintUpdate, CommentCreate
from datetime import datetime, timedelta, timezone

def create_complaint(db: Session, user_id: int, complaint_in: ComplaintCreate) -> Complaint:
    priority = complaint_in.priority or "Normal"
    
    # Calculate SLA deadline based on priority
    sla_hours = {"Critical": 4, "High": 24, "Medium": 48, "Low": 72, "Normal": 48}.get(priority, 48)
    sla_deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)

    db_complaint = Complaint(
        user_id=user_id,
        title=complaint_in.title,
        category=complaint_in.category,
        description=complaint_in.description,
        location=complaint_in.location,
        priority=priority,
        status="Open",
        latitude=complaint_in.latitude,
        longitude=complaint_in.longitude,
        sla_deadline=sla_deadline,
        version=1,
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint

def get_complaints(db: Session) -> list[Complaint]:
    stmt = select(Complaint).order_by(Complaint.created_at.desc())
    result = db.execute(stmt)
    return list(result.scalars().all())

def get_complaint(db: Session, complaint_id: int) -> Complaint:
    stmt = select(Complaint).where(Complaint.id == complaint_id)
    result = db.execute(stmt)
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return complaint

def update_complaint(db: Session, complaint_id: int, complaint_in: ComplaintUpdate) -> Complaint:
    complaint = get_complaint(db, complaint_id)
    
    update_data = complaint_in.model_dump(exclude_unset=True)
    
    if "expected_version" in update_data:
        expected_version = update_data.pop("expected_version")
        if expected_version is not None and expected_version != complaint.version:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict: Ticket modified by another user.")
    
    if "status" in update_data:
        new_status = update_data["status"]
        valid_statuses = ["Open", "In Progress", "Resolved", "Closed"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    for field, value in update_data.items():
        setattr(complaint, field, value)
        
    complaint.version += 1
        
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


# ── Comments ────────────────────────────────────────────────────────

def add_comment(
    db: Session, complaint_id: int, user_id: int, comment_in: CommentCreate
) -> ComplaintComment:
    complaint = get_complaint(db, complaint_id)  # raises 404 if not found
    comment = ComplaintComment(
        complaint_id=complaint.id,
        user_id=user_id,
        body=comment_in.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def get_comments(db: Session, complaint_id: int) -> list[ComplaintComment]:
    from sqlalchemy.future import select as sa_select
    get_complaint(db, complaint_id)  # raises 404 if not found
    stmt = (
        sa_select(ComplaintComment)
        .where(ComplaintComment.complaint_id == complaint_id)
        .order_by(ComplaintComment.created_at)
    )
    return list(db.execute(stmt).scalars().all())
