from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.amenities.permissions import ensure_member, ensure_operational, ensure_resident
from app.amenities.schemas import AmenityCreate, BookingCreate
from app.amenities.service import _week_bounds


def user_with_role(role: str):
    return SimpleNamespace(
        roles=[
            SimpleNamespace(role=SimpleNamespace(role_name=SimpleNamespace(value=role)))
        ]
    )


@pytest.mark.parametrize(
    "role",
    ["super_admin", "admin", "committee_member", "flat_owner", "resident_rental"],
)
def test_society_members_can_list_amenities(role):
    ensure_member(user_with_role(role))


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_configure_amenities(role):
    ensure_operational(user_with_role(role))


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental"])
def test_resident_roles_can_book(role):
    ensure_resident(user_with_role(role))


def test_staff_cannot_access_resident_booking():
    with pytest.raises(HTTPException) as exc_info:
        ensure_resident(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


def test_resident_cannot_configure_amenity():
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_role("flat_owner"))
    assert exc_info.value.status_code == 403


def test_amenity_contract_validates_limits():
    with pytest.raises(ValidationError):
        AmenityCreate(name="A", capacity=0, slot_minutes=10, weekly_limit=0)


def test_booking_contract_requires_supported_purpose():
    with pytest.raises(ValidationError):
        BookingCreate(
            amenity_id=1, starts_at=datetime.now(timezone.utc), purpose="Invalid"
        )


def test_weekly_quota_resets_at_sunday_midnight_ist():
    start, end = _week_bounds(date(2026, 8, 12))
    assert start.astimezone().timestamp() < end.astimezone().timestamp()
    assert (end - start).days == 7
    assert start.astimezone(timezone.utc).isoformat() == "2026-08-08T18:30:00+00:00"
