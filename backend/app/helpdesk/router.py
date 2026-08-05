"""Compatibility export for the existing /api/helpdesk frontend contract."""

from app.helpdesk.complaints.router import legacy_router as router


__all__ = ["router"]
