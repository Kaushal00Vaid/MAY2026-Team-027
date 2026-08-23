from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AmenityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(
        "Bookable society facility.", min_length=2, max_length=2000
    )
    image_url: str | None = Field(None, max_length=2000)
    capacity: int = Field(1, ge=1, le=1000)
    operating_start: time = time(6, 0)
    operating_end: time = time(22, 0)
    slot_minutes: int = Field(60, ge=15, le=480)
    weekly_limit: int = Field(5, ge=1, le=50)

    @field_validator("name", "description")
    @classmethod
    def strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value


class AmenityUpdate(BaseModel):
    description: str | None = Field(None, min_length=2, max_length=2000)
    image_url: str | None = Field(None, max_length=2000)
    capacity: int | None = Field(None, ge=1, le=1000)
    operating_start: time | None = None
    operating_end: time | None = None
    slot_minutes: int | None = Field(None, ge=15, le=480)
    weekly_limit: int | None = Field(None, ge=1, le=50)
    is_active: bool | None = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value

    @field_validator("image_url")
    @classmethod
    def normalize_image_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class AmenityResponse(BaseModel):
    id: int
    name: str
    description: str
    image_url: str | None
    capacity: int
    operating_start: time
    operating_end: time
    slot_minutes: int
    weekly_limit: int
    is_active: bool


class BookingCreate(BaseModel):
    amenity_id: int = Field(..., gt=0)
    starts_at: datetime
    purpose: Literal[
        "Private Event", "Society Meeting", "Fitness", "Recreation", "Other"
    ] = "Recreation"


class BookingResponse(BaseModel):
    id: int
    amenity_id: int
    amenity_name: str
    resident_id: int
    resident_name: str
    unit: str | None
    starts_at: datetime
    ends_at: datetime
    purpose: str
    status: str
    created_at: datetime


class PaginatedBookings(BaseModel):
    items: list[BookingResponse]
    total: int
    page: int
    page_size: int


class AvailabilitySlot(BaseModel):
    starts_at: datetime
    ends_at: datetime
    available: bool
    booking: BookingResponse | None = None


class AvailabilityResponse(BaseModel):
    amenity: AmenityResponse
    start_date: date
    days: int
    slots: list[AvailabilitySlot]
    weekly_used: int
    weekly_limit: int
