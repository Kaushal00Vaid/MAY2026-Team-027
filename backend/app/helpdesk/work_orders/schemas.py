from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AssigneeResponse(BaseModel):
    user_id: int
    name: str
    staff_type: str | None
    on_duty: bool


class WorkOrderResponse(BaseModel):
    id: int
    complaint_id: int
    complaint_version: int
    title: str
    description: str
    category: str
    location: str | None
    priority: str
    status: str
    reporter_name: str
    assigned_to: int
    assignee_name: str
    instructions: list[str]
    resolution_notes: str | None
    sla_deadline: datetime | None
    created_at: datetime
    updated_at: datetime


class WorkOrderListResponse(BaseModel):
    items: list[WorkOrderResponse]
    total: int


class DutyStateRequest(BaseModel):
    on_duty: bool


class DutyStateResponse(BaseModel):
    on_duty: bool
    updated_at: datetime


class HelpdeskStatsResponse(BaseModel):
    active: int
    unassigned: int
    sla_warning: int
    breached: int
    resolved_today: int


class KnownIssueResponse(BaseModel):
    complaint_id: int
    title: str
    category: str
    location: str | None
    status: str
    report_count: int
    subscriber_count: int
    created_at: datetime
    subscribed: bool


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2_000)

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        return value


class AssistantRequest(BaseModel):
    message: str = Field(..., min_length=3, max_length=2_000)
    history: list[AssistantMessage] = Field(default_factory=list, max_length=10)

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        return value


class AssistantResponse(BaseModel):
    message: str
    suggested_category: str
    known_issue: KnownIssueResponse | None


class EscalationRequest(BaseModel):
    expected_version: int = Field(..., ge=1)
    note: str | None = Field(None, max_length=2_000)


WorkOrderFilter = Literal["all", "urgent", "plumbing", "electrical"]
