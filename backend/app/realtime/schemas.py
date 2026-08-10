from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TicketResponse(BaseModel):
    ticket: str
    expires_at: datetime


class NotificationResponse(BaseModel):
    id: int
    event_type: str
    title: str
    message: str
    resource_type: str | None
    resource_id: str | None
    payload: dict[str, Any]
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int


class ReadAllResponse(BaseModel):
    updated_count: int = Field(ge=0)
