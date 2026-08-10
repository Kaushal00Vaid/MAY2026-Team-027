"""
tests/unit/amenities/test_amenities_rules.py
Unit tests for amenities permissions, schema validation, and service helpers.

Tests are pure Python — no HTTP, no database.
"""
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


# ── Permission: ensure_member ──────────────────────────────────────────────


@pytest.mark.parametrize(
    "role",
    ["super_admin", "admin", "committee_member", "flat_owner", "resident_rental"],
)
def test_society_members_can_list_amenities(role):
    """All society member roles should pass the ensure_member gate."""
    ensure_member(user_with_role(role))


def test_support_staff_cannot_list_amenities():
    """Support staff are not society members for amenity access."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_member(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


# ── Permission: ensure_operational ────────────────────────────────────────


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_configure_amenities(role):
    """Admins and committee members should be able to manage amenities."""
    ensure_operational(user_with_role(role))


def test_resident_cannot_configure_amenity():
    """Residents must not be able to create or configure amenities."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_role("flat_owner"))
    assert exc_info.value.status_code == 403


def test_rental_resident_cannot_configure_amenity():
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_role("resident_rental"))
    assert exc_info.value.status_code == 403


# ── Permission: ensure_resident ───────────────────────────────────────────


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental"])
def test_resident_roles_can_book(role):
    """Only resident roles may create bookings."""
    ensure_resident(user_with_role(role))


def test_staff_cannot_access_resident_booking():
    """Support staff cannot make personal amenity bookings."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_resident(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


def test_committee_cannot_book_as_resident():
    """Committee members use operational flow, not resident booking flow."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_resident(user_with_role("committee_member"))
    assert exc_info.value.status_code == 403


# ── Schema: AmenityCreate ─────────────────────────────────────────────────


def test_amenity_contract_validates_zero_capacity():
    """Amenity with zero capacity must be rejected."""
    with pytest.raises(ValidationError):
        AmenityCreate(name="A", capacity=0, slot_minutes=10, weekly_limit=1)


def test_amenity_contract_validates_zero_weekly_limit():
    """Amenity with zero weekly_limit must be rejected."""
    with pytest.raises(ValidationError):
        AmenityCreate(name="A", capacity=1, slot_minutes=10, weekly_limit=0)


def test_valid_amenity_create():
    """A valid AmenityCreate should not raise."""
    a = AmenityCreate(name="Swimming Pool", capacity=20, slot_minutes=60, weekly_limit=3)
    assert a.name == "Swimming Pool"
    assert a.capacity == 20


# ── Schema: BookingCreate ─────────────────────────────────────────────────


def test_booking_contract_requires_supported_purpose():
    """BookingCreate with an unsupported purpose must raise ValidationError."""
    with pytest.raises(ValidationError):
        BookingCreate(
            amenity_id=1, starts_at=datetime.now(timezone.utc), purpose="Invalid"
        )


# ── Service helper: _week_bounds ──────────────────────────────────────────


def test_weekly_quota_resets_at_sunday_midnight_ist():
    """Week bounds should span exactly 7 days, starting Sunday IST."""
    start, end = _week_bounds(date(2026, 8, 12))
    assert start.astimezone().timestamp() < end.astimezone().timestamp()
    assert (end - start).days == 7
    assert start.astimezone(timezone.utc).isoformat() == "2026-08-08T18:30:00+00:00"


def test_week_bounds_returns_utc_datetimes():
    """_week_bounds should return timezone-aware datetimes."""
    start, end = _week_bounds(date(2026, 8, 12))
    assert start.tzinfo is not None
    assert end.tzinfo is not None
