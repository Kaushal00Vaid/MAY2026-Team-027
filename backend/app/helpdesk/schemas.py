"""Compatibility imports; new code lives in helpdesk.complaints."""

from app.helpdesk.complaints.schemas import (  # noqa: F401
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
