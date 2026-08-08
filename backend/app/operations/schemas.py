from datetime import datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    location: str = Field(..., min_length=2, max_length=200)
    category: str = Field("General", min_length=2, max_length=80)
    assigned_to: int | None = Field(None, gt=0)
    due_at: datetime | None = None

    @field_validator("title", "location", "category")
    @classmethod
    def strip(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value


class TaskUpdate(BaseModel):
    status: Literal["pending", "in_progress", "completed", "cancelled"]
    completion_notes: str | None = Field(None, max_length=2000)


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., min_length=2, max_length=100)
    unit_symbol: str = Field(..., min_length=1, max_length=20)
    initial_quantity: Decimal = Field(0, ge=0)
    reorder_threshold: Decimal = Field(0, ge=0)
    vendor_id: int | None = Field(None, gt=0)


class MovementCreate(BaseModel):
    movement_type: Literal["received", "consumed", "adjusted"]
    quantity: Decimal = Field(..., gt=0)
    note: str = Field(..., min_length=2, max_length=500)


class ShiftCreate(BaseModel):
    staff_id: int = Field(..., gt=0)
    role_label: str = Field(..., min_length=2, max_length=100)
    start_time: time
    end_time: time
    days_mask: int = Field(..., ge=1, le=127)


class ShiftStatus(BaseModel):
    status: Literal["active", "on_leave", "inactive"]
