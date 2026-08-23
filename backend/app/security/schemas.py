from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class VisitorCreate(BaseModel):
    visitor_name: str = Field(..., min_length=2, max_length=150)
    target_unit: str = Field(..., min_length=1, max_length=30)
    phone_number: str | None = Field(None, max_length=20)
    purpose: str = Field(..., min_length=1, max_length=100)
    vehicle_number: str | None = Field(None, max_length=30)

    @field_validator(
        "visitor_name", "target_unit", "phone_number", "purpose", "vehicle_number"
    )
    @classmethod
    def strip(cls, value):
        return value.strip() if value else value

    @model_validator(mode="after")
    def required_text_not_blank(self):
        if not self.visitor_name or not self.target_unit or not self.purpose:
            raise ValueError("Visitor name, target unit, and purpose cannot be blank.")
        return self


class DecisionRequest(BaseModel):
    decision: Literal["approved", "denied"]
    expected_version: int = Field(..., ge=1)
    note: str | None = Field(None, max_length=1000)


class VisitorResponse(BaseModel):
    id: int
    visitor_name: str
    phone_number: str | None
    purpose: str
    vehicle_number: str | None
    unit: str | None
    resident_name: str
    resident_note: str | None
    status: str
    requested_at: datetime
    expires_at: datetime
    entry_at: datetime | None
    exit_at: datetime | None
    version: int


class VisitorList(BaseModel):
    items: list[VisitorResponse]
    total: int
    page: int
    page_size: int


class GuestPassCreate(BaseModel):
    guest_name: str = Field(..., min_length=2, max_length=150)
    phone_number: str | None = Field(None, max_length=20)
    purpose: str = Field("Guest / Friend", min_length=1, max_length=100)
    valid_hours: int = Field(6, ge=1, le=72)


class GuestPassResponse(BaseModel):
    id: int
    guest_name: str
    purpose: str
    public_id: str
    valid_until: datetime
    used_at: datetime | None
    revoked_at: datetime | None
    status: str
    pin: str | None = None


class PinVerify(BaseModel):
    pin: str = Field(..., pattern=r"^\d{4}$")


class ManualEntry(BaseModel):
    unit: str = Field(..., min_length=1, max_length=30)


class AccessLogResponse(BaseModel):
    id: int
    event_type: str
    subject_name: str
    unit: str | None
    gate: str
    details: str | None
    occurred_at: datetime


class ResidentIdResponse(BaseModel):
    token: str
    expires_at: datetime


class ResidentIdVerify(BaseModel):
    token: str = Field(..., min_length=20, max_length=2000)
