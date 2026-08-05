import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models.user import User
from app.helpdesk.complaints.models import ComplaintAttachment
from app.helpdesk.complaints.service import get_complaint
from app.helpdesk.attachments.validation import ALLOWED_MIME_TYPES, matches_declared_type


def save_attachment(
    db: Session,
    user: User,
    complaint_id: int,
    upload: UploadFile,
    latitude: float | None,
    longitude: float | None,
) -> ComplaintAttachment:
    get_complaint(db, user, complaint_id)
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude and longitude must be supplied together.",
        )
    if latitude is not None and not -90 <= latitude <= 90:
        raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90.")
    if longitude is not None and not -180 <= longitude <= 180:
        raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180.")

    mime_type = (upload.content_type or "").lower()
    extension = ALLOWED_MIME_TYPES.get(mime_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WebP, and PDF attachments are allowed.",
        )

    content = upload.file.read(settings.HELPDESK_MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="Attachment cannot be empty.")
    if len(content) > settings.HELPDESK_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Attachment exceeds the {settings.HELPDESK_MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
        )
    if not matches_declared_type(content, mime_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Attachment content does not match its declared MIME type.",
        )

    relative_directory = Path("helpdesk") / str(complaint_id)
    storage_key = str(relative_directory / f"{uuid.uuid4().hex}{extension}")
    media_root = Path(settings.MEDIA_ROOT).resolve()
    destination = (media_root / storage_key).resolve()
    if media_root not in destination.parents:
        raise HTTPException(status_code=400, detail="Invalid attachment destination.")
    destination.parent.mkdir(parents=True, exist_ok=True)

    attachment = ComplaintAttachment(
        complaint_id=complaint_id,
        uploaded_by=user.user_id,
        original_filename=(Path(upload.filename or "attachment").name[:255]),
        storage_key=storage_key,
        mime_type=mime_type,
        size_bytes=len(content),
        latitude=latitude,
        longitude=longitude,
    )
    try:
        with destination.open("xb") as file_handle:
            file_handle.write(content)
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        return attachment
    except Exception:
        db.rollback()
        try:
            os.unlink(destination)
        except FileNotFoundError:
            pass
        raise


def list_attachments(
    db: Session, user: User, complaint_id: int
) -> list[ComplaintAttachment]:
    get_complaint(db, user, complaint_id)
    return list(
        db.scalars(
            select(ComplaintAttachment)
            .where(ComplaintAttachment.complaint_id == complaint_id)
            .order_by(ComplaintAttachment.created_at, ComplaintAttachment.id)
        ).all()
    )


def attachment_response(attachment: ComplaintAttachment) -> dict:
    return {
        "id": attachment.id,
        "complaint_id": attachment.complaint_id,
        "original_filename": attachment.original_filename,
        "mime_type": attachment.mime_type,
        "size_bytes": attachment.size_bytes,
        "latitude": attachment.latitude,
        "longitude": attachment.longitude,
        "url": (
            f"/api/v1/complaints/{attachment.complaint_id}/attachments/"
            f"{attachment.id}"
        ),
    }


def get_attachment(
    db: Session, user: User, complaint_id: int, attachment_id: int
) -> tuple[ComplaintAttachment, Path]:
    get_complaint(db, user, complaint_id)
    attachment = db.scalar(
        select(ComplaintAttachment).where(
            ComplaintAttachment.id == attachment_id,
            ComplaintAttachment.complaint_id == complaint_id,
        )
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    media_root = Path(settings.MEDIA_ROOT).resolve()
    path = (media_root / attachment.storage_key).resolve()
    if media_root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Attachment file not found.")
    return attachment, path
