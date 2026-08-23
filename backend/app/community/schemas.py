from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1, max_length=10_000)
    target_type: Literal["all", "block", "flat"] = "all"
    target_value: str | None = Field(None, max_length=50)
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def validate_target(self):
        self.title = self.title.strip()
        self.body = self.body.strip()
        self.target_value = self.target_value.strip() if self.target_value else None
        if not self.title:
            raise ValueError("Notice title cannot be blank")
        if not self.body:
            raise ValueError("Notice body cannot be blank")
        if self.target_type != "all" and not self.target_value:
            raise ValueError("A block or flat value is required for targeted notices")
        if self.target_type == "all":
            self.target_value = None
        return self


class NoticeResponse(BaseModel):
    id: int
    title: str
    body: str
    target_type: str
    target_value: str | None
    target_label: str
    published_at: datetime
    expires_at: datetime | None
    is_read: bool


class PaginatedNotices(BaseModel):
    items: list[NoticeResponse]
    total: int
    page: int
    page_size: int


class EventRsvpUpdate(BaseModel):
    status: Literal["going", "not_going"]


class EventResponse(BaseModel):
    id: int
    title: str
    description: str | None
    location: str
    starts_at: datetime
    ends_at: datetime
    capacity: int | None
    going_count: int
    my_status: str | None


class VolunteerResponse(BaseModel):
    id: int
    title: str
    description: str
    volunteers_needed: int
    signup_count: int
    spots_remaining: int
    closes_at: datetime | None
    signed_up: bool


class PollVoteCreate(BaseModel):
    option_id: int = Field(..., gt=0)


class PollOptionResponse(BaseModel):
    id: int
    label: str
    votes: int
    percentage: int


class PollResponse(BaseModel):
    id: int
    question: str
    description: str | None
    ends_at: datetime
    total_votes: int
    selected_option_id: int | None
    options: list[PollOptionResponse]


class DiscussionResponse(BaseModel):
    id: int
    title: str
    body: str
    tag: str
    author: str
    author_flat: str | None
    reply_count: int
    like_count: int
    created_at: datetime


class PaginatedDiscussions(BaseModel):
    items: list[DiscussionResponse]
    total: int
    page: int
    page_size: int


class DirectoryResponse(BaseModel):
    user_id: int
    name: str
    unit: str | None
    role: str
    status: str
    joined_at: datetime


class PaginatedDirectory(BaseModel):
    items: list[DirectoryResponse]
    total: int
    page: int
    page_size: int
