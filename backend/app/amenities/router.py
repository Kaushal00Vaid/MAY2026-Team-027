from datetime import date

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.amenities import service
from app.amenities.schemas import (
    AmenityCreate,
    AmenityResponse,
    AmenityUpdate,
    AvailabilityResponse,
    BookingCreate,
    BookingResponse,
    PaginatedBookings,
)
from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/amenities", response_model=list[AmenityResponse])
def amenities(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.list_amenities(db, user, include_inactive)


@router.post(
    "/amenities", response_model=AmenityResponse, status_code=status.HTTP_201_CREATED
)
def create_amenity(
    data: AmenityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_amenity(db, user, data)


@router.patch("/amenities/{amenity_id}", response_model=AmenityResponse)
def update_amenity(
    amenity_id: int,
    data: AmenityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_amenity(db, user, amenity_id, data)


@router.get("/amenities/{amenity_id}/availability", response_model=AvailabilityResponse)
def availability(
    amenity_id: int,
    start_date: date,
    days: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.availability(db, user, amenity_id, start_date, days)


@router.get("/bookings", response_model=PaginatedBookings)
def bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    start_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = service.list_bookings(db, user, page, page_size, start_date)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post(
    "/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED
)
def create_booking(
    data: BookingCreate,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=100
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_booking(db, user, data, idempotency_key)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.cancel_booking(db, user, booking_id)
