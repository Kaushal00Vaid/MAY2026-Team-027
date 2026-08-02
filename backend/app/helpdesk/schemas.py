from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ComplaintCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    category: str = Field(..., max_length=100)
    description: str
    location: Optional[str] = Field(None, max_length=255)
    priority: Optional[str] = Field("Normal", max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ComplaintUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    priority: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    assigned_to: Optional[int] = None
    parent_id: Optional[int] = None
    work_order_notes: Optional[str] = None
    expected_version: Optional[int] = None

class ComplaintResponse(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    category: str
    description: str
    location: Optional[str]
    priority: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    assigned_to: Optional[int]
    sla_deadline: Optional[datetime]
    parent_id: Optional[int]
    work_order_notes: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Comments ──────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    id: int
    complaint_id: int
    user_id: int
    body: str
    created_at: datetime
    author_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
