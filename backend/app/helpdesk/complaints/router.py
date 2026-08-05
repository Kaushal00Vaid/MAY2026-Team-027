from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user
from app.helpdesk.attachments import service as attachment_service
from app.helpdesk.complaints import service
from app.helpdesk.complaints.schemas import (
    AttachmentResponse,
    CommentCreate,
    CommentResponse,
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintResponse,
    ComplaintStatus,
    ComplaintUpdate,
    StatusHistoryResponse,
)
from app.helpdesk.work_orders.schemas import EscalationRequest


router = APIRouter()
legacy_router = APIRouter()


def _comment_response(comment) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        complaint_id=comment.complaint_id,
        user_id=comment.user_id,
        body=comment.body,
        created_at=comment.created_at,
        author_name=f"{comment.author.first_name} {comment.author.last_name}",
        is_internal=comment.is_internal,
    )


def _create(data: ComplaintCreate, user: User, db: Session):
    return service.create_complaint(db, user, data)


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
@legacy_router.post(
    "/complaints",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_complaint(
    data: ComplaintCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _create(data, user, db)


@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    complaint_status: ComplaintStatus | None = Query(None, alias="status"),
    category: str | None = Query(None, min_length=1, max_length=100),
    priority: Literal["Low", "Medium", "High", "Critical", "Normal"] | None = None,
    sort_by: Literal["created_at", "updated_at", "priority"] = "updated_at",
    sort_order: Literal["asc", "desc"] = "desc",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = service.list_complaints(
        db,
        user,
        page=page,
        page_size=page_size,
        search=search,
        complaint_status=complaint_status.value if complaint_status else None,
        category=category,
        priority=priority,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return ComplaintListResponse(items=items, total=total, page=page, page_size=page_size)


@legacy_router.get("/complaints", response_model=list[ComplaintResponse])
def list_complaints_legacy(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, _ = service.list_complaints(db, user, page=1, page_size=100)
    return items


@router.get("/{complaint_id}", response_model=ComplaintResponse)
@legacy_router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_complaint(db, user, complaint_id)


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
@legacy_router.patch("/complaints/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: int,
    data: ComplaintUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.update_complaint(db, user, complaint_id, data)


@router.post("/{complaint_id}/escalate", response_model=ComplaintResponse)
@legacy_router.post("/complaints/{complaint_id}/escalate", response_model=ComplaintResponse)
def escalate_complaint(
    complaint_id: int,
    data: EscalationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.escalate_complaint(
        db, user, complaint_id, data.expected_version, data.note
    )


@router.post(
    "/{complaint_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
@legacy_router.post(
    "/complaints/{complaint_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    complaint_id: int,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _comment_response(service.add_comment(db, user, complaint_id, data))


@router.get("/{complaint_id}/comments", response_model=list[CommentResponse])
@legacy_router.get(
    "/complaints/{complaint_id}/comments", response_model=list[CommentResponse]
)
def list_comments(
    complaint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_comment_response(item) for item in service.list_comments(db, user, complaint_id)]


@router.get(
    "/{complaint_id}/status-history", response_model=list[StatusHistoryResponse]
)
@legacy_router.get(
    "/complaints/{complaint_id}/status-history",
    response_model=list[StatusHistoryResponse],
)
def list_status_history(
    complaint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_status_history(db, user, complaint_id)


@router.post(
    "/{complaint_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
@legacy_router.post(
    "/complaints/{complaint_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_attachment(
    complaint_id: int,
    file: Annotated[UploadFile, File()],
    latitude: Annotated[float | None, Form()] = None,
    longitude: Annotated[float | None, Form()] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attachment = attachment_service.save_attachment(
        db, user, complaint_id, file, latitude, longitude
    )
    return attachment_service.attachment_response(attachment)


@router.get(
    "/{complaint_id}/attachments", response_model=list[AttachmentResponse]
)
@legacy_router.get(
    "/complaints/{complaint_id}/attachments",
    response_model=list[AttachmentResponse],
)
def list_attachments(
    complaint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        attachment_service.attachment_response(item)
        for item in attachment_service.list_attachments(db, user, complaint_id)
    ]


@router.get("/{complaint_id}/attachments/{attachment_id}", response_class=FileResponse)
@legacy_router.get(
    "/complaints/{complaint_id}/attachments/{attachment_id}",
    response_class=FileResponse,
)
def download_attachment(
    complaint_id: int,
    attachment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attachment, path = attachment_service.get_attachment(
        db, user, complaint_id, attachment_id
    )
    return FileResponse(
        path,
        media_type=attachment.mime_type,
        filename=attachment.original_filename,
    )
