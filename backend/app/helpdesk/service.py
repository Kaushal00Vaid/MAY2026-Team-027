"""Compatibility imports; new code lives in helpdesk.complaints."""

from app.helpdesk.complaints.service import (  # noqa: F401
    STATUS_TRANSITIONS,
    add_comment,
    create_complaint,
    escalate_complaint,
    get_complaint,
    list_comments,
    list_complaints,
    list_status_history,
    update_complaint,
)
