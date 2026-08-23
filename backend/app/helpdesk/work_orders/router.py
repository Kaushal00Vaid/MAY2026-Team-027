from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user
from app.core.security import limiter
from app.helpdesk.complaints.permissions import ensure_resident
from app.helpdesk.work_orders import service
from app.helpdesk.work_orders.schemas import (
    AssistantRequest,
    AssistantResponse,
    AssigneeResponse,
    DutyStateRequest,
    DutyStateResponse,
    HelpdeskStatsResponse,
    KnownIssueResponse,
    WorkOrderListResponse,
    WorkOrderResponse,
)


router = APIRouter()


@router.get("/assignees", response_model=list[AssigneeResponse])
def assignees(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return service.list_assignees(db, user)


@router.get("/stats", response_model=HelpdeskStatsResponse)
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.get_helpdesk_stats(db, user)


@router.get("/known-issues", response_model=list[KnownIssueResponse])
def known_issues(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return service.list_known_issues(db, user)


@router.post("/known-issues/{complaint_id}/subscribe", response_model=KnownIssueResponse)
def subscribe(
    complaint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.subscribe_known_issue(db, user, complaint_id)


@router.post("/assistant/analyze", response_model=AssistantResponse)
@limiter.limit("10/minute")
def analyze(
    request: Request,
    data: AssistantRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_resident(user)
    return service.analyze_message(db, user, data.message, data.history)


@router.get("/maintenance-tasks", response_model=WorkOrderListResponse)
def work_orders(
    filter_by: Literal["all", "urgent", "plumbing", "electrical"] = "all",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = service.list_work_orders(db, user, filter_by)
    return {"items": items, "total": len(items)}


@router.post(
    "/maintenance-tasks/{task_id}/complete", response_model=WorkOrderResponse
)
def complete_work_order(
    task_id: int,
    resolution_notes: Annotated[str, Form(min_length=3, max_length=10_000)],
    photo: Annotated[UploadFile, File()],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.complete_work_order(db, user, task_id, resolution_notes, photo)


@router.get("/maintenance-duty", response_model=DutyStateResponse)
def duty_state(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return service.get_duty_state(db, user)


@router.put("/maintenance-duty", response_model=DutyStateResponse)
def update_duty_state(
    data: DutyStateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.set_duty_state(db, user, data.on_duty)
