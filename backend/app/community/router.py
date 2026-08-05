from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.community import service
from app.community.schemas import (
    EventResponse, EventRsvpUpdate, NoticeCreate, NoticeResponse,
    PaginatedDirectory, PaginatedDiscussions, PaginatedNotices,
    PollResponse, PollVoteCreate, VolunteerResponse,
)
from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/notices", response_model=PaginatedNotices)
def notices(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items, total = service.list_notices(db, user, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/notices", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
def create_notice(data: NoticeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.create_notice(db, user, data)


@router.post("/notices/{notice_id}/read", response_model=NoticeResponse)
def read_notice(notice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.mark_notice_read(db, user, notice_id)


@router.get("/events", response_model=list[EventResponse])
def events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_events(db, user)


@router.put("/events/{event_id}/rsvp", response_model=EventResponse)
def event_rsvp(event_id: int, data: EventRsvpUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.rsvp_event(db, user, event_id, data.status)


@router.get("/volunteers", response_model=list[VolunteerResponse])
def volunteers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_volunteers(db, user)


@router.post("/volunteers/{opportunity_id}/signup", response_model=VolunteerResponse)
def volunteer_signup(opportunity_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.signup_volunteer(db, user, opportunity_id)


@router.delete("/volunteers/{opportunity_id}/signup", response_model=VolunteerResponse)
def volunteer_withdraw(opportunity_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.withdraw_volunteer(db, user, opportunity_id)


@router.get("/polls/active", response_model=PollResponse | None)
def poll(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.active_poll(db, user)


@router.post("/polls/{poll_id}/votes", response_model=PollResponse, status_code=status.HTTP_201_CREATED)
def poll_vote(poll_id: int, data: PollVoteCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.vote(db, user, poll_id, data.option_id)


@router.get("/discussions", response_model=PaginatedDiscussions)
def discussions(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items, total = service.list_discussions(db, user, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/directory", response_model=PaginatedDirectory)
def resident_directory(search: str | None = Query(None, max_length=200), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items, total = service.directory(db, user, search, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}
