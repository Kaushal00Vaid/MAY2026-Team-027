from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ComplaintPriority(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"
    normal = "Normal"


class ComplaintStatus(str, Enum):
    open = "Open"
    in_progress = "In Progress"
    resolved = "Resolved"
    closed = "Closed"


class ComplaintCreate(BaseModel):
    title: str | None = Field(None, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=10_000)
    location: str | None = Field(None, max_length=255)
    priority: ComplaintPriority = ComplaintPriority.normal
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

    @field_validator("title", "category", "description", "location")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def coordinates_are_a_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be supplied together")
        return self


class ComplaintUpdate(BaseModel):
    status: ComplaintStatus | None = None
    assigned_to: int | None = Field(None, gt=0)
    work_order_notes: str | None = Field(None, max_length=10_000)
    expected_version: int = Field(..., ge=1)
    status_note: str | None = Field(None, max_length=2_000)


class ComplaintResponse(BaseModel):
    id: int
    user_id: int
    title: str | None
    category: str
    description: str
    location: str | None
    priority: str
    status: str
    latitude: float | None
    longitude: float | None
    assigned_to: int | None
    sla_deadline: datetime | None
    parent_id: int | None
    work_order_notes: str | None
    resolution_notes: str | None
    resolved_at: datetime | None
    escalated_at: datetime | None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ComplaintListResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    page: int
    page_size: int


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2_000)
    is_internal: bool = False

    @field_validator("body")
    @classmethod
    def body_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Comment cannot be blank")
        return value


class CommentResponse(BaseModel):
    id: int
    complaint_id: int
    user_id: int
    body: str
    created_at: datetime
    author_name: str | None = None
    is_internal: bool = False

    model_config = ConfigDict(from_attributes=True)


class StatusHistoryResponse(BaseModel):
    id: int
    complaint_id: int
    from_status: str | None
    to_status: str
    changed_by: int | None
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttachmentResponse(BaseModel):
    id: int
    complaint_id: int
    original_filename: str
    mime_type: Literal["image/jpeg", "image/png", "image/webp", "application/pdf"]
    size_bytes: int
    latitude: float | None
    longitude: float | None
    url: str
