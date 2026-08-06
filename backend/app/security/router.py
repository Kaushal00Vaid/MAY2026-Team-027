from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user
from app.security import service
from app.security.schemas import (
    AccessLogResponse,
    DecisionRequest,
    GuestPassCreate,
    GuestPassResponse,
    ManualEntry,
    PinVerify,
    ResidentIdResponse,
    ResidentIdVerify,
    VisitorCreate,
    VisitorList,
    VisitorResponse,
)

router = APIRouter()


@router.get("/resident-id", response_model=ResidentIdResponse)
def resident_id(user: User = Depends(get_current_user)):
    return service.issue_resident_id(user)


@router.post("/resident-id/verify", response_model=AccessLogResponse)
def verify_resident_id(
    data: ResidentIdVerify,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.verify_resident_id(db, user, data.token)


@router.get("/visitors", response_model=VisitorList)
def visitors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    visitor_status: Literal[
        "pending", "approved", "denied", "expired", "inside", "exited"
    ]
    | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = service.list_visitors(
        db, user, page, page_size, search, visitor_status
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post(
    "/visitors", response_model=VisitorResponse, status_code=status.HTTP_201_CREATED
)
def create_visitor(
    data: VisitorCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_visitor(db, user, data)


@router.post("/visitors/{visitor_id}/decision", response_model=VisitorResponse)
def decide(
    visitor_id: int,
    data: DecisionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.decide(
        db, user, visitor_id, data.decision, data.expected_version, data.note
    )


@router.post("/visitors/{visitor_id}/entry", response_model=VisitorResponse)
def entry(
    visitor_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.gate_transition(db, user, visitor_id, "entry")


@router.post("/visitors/{visitor_id}/exit", response_model=VisitorResponse)
def exit_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.gate_transition(db, user, visitor_id, "exit")


@router.get("/guest-passes", response_model=list[GuestPassResponse])
def passes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_passes(db, user)


@router.post(
    "/guest-passes",
    response_model=GuestPassResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_pass(
    data: GuestPassCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_pass(db, user, data)


@router.post("/guest-passes/{pass_id}/revoke", response_model=GuestPassResponse)
def revoke(
    pass_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return service.revoke_pass(db, user, pass_id)


@router.post("/guest-passes/verify-pin", response_model=GuestPassResponse)
def verify(
    data: PinVerify,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.verify_pin(db, user, data.pin)


@router.post(
    "/access-logs/manual-entry",
    response_model=AccessLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def manual(
    data: ManualEntry,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.manual_entry(db, user, data.unit)


@router.get("/access-logs", response_model=list[AccessLogResponse])
def access_logs(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.logs(db, user, limit)
