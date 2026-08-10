"""
tests/unit/security/test_security_validation.py
Unit tests for security module schema validation, permission guards,
pin digest, and guest pass status logic.

Tests are pure Python — no HTTP, no database.
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.security.permissions import ensure_gate, ensure_resident
from app.security.schemas import GuestPassCreate, PinVerify, VisitorCreate
from app.security.service import digest, pass_dict


def user(role: str, staff_type: str | None = None):
    assignment = SimpleNamespace(
        role=SimpleNamespace(role_name=SimpleNamespace(value=role))
    )
    return SimpleNamespace(roles=[assignment], staff_type=staff_type)


# ── Schema: VisitorCreate ──────────────────────────────────────────────────


def test_visitor_fields_are_trimmed():
    """visitor_name, target_unit, and purpose should have whitespace stripped."""
    value = VisitorCreate(
        visitor_name="  Maya  ", target_unit=" A-101 ", purpose=" Delivery "
    )
    assert value.visitor_name == "Maya"
    assert value.target_unit == "A-101"


def test_visitor_create_valid():
    """A fully valid VisitorCreate should not raise."""
    v = VisitorCreate(visitor_name="John", target_unit="B-202", purpose="Visit")
    assert v.visitor_name == "John"


# ── Schema: PinVerify ─────────────────────────────────────────────────────


@pytest.mark.parametrize("pin", ["123", "12345", "12a4", ""])
def test_guest_pin_requires_exactly_four_digits(pin):
    """PINs that are not exactly 4 digits must be rejected."""
    with pytest.raises(ValidationError):
        PinVerify(pin=pin)


def test_valid_four_digit_pin_accepted():
    """A valid 4-digit PIN should be accepted."""
    pv = PinVerify(pin="1234")
    assert pv.pin == "1234"


# ── Schema: GuestPassCreate ───────────────────────────────────────────────


def test_guest_pass_duration_is_bounded():
    """valid_hours > 72 must be rejected (max 3 days)."""
    with pytest.raises(ValidationError):
        GuestPassCreate(guest_name="Guest", valid_hours=73)


def test_guest_pass_zero_hours_rejected():
    """Zero hours is not a valid pass duration."""
    with pytest.raises(ValidationError):
        GuestPassCreate(guest_name="Guest", valid_hours=0)


def test_guest_pass_max_hours_accepted():
    """72 hours is the maximum allowed and should pass."""
    gp = GuestPassCreate(guest_name="Guest", valid_hours=72)
    assert gp.valid_hours == 72


# ── PIN digest ────────────────────────────────────────────────────────────


def test_pin_digest_is_deterministic_and_not_plaintext():
    """digest() must be deterministic and not store the PIN in plain text."""
    assert digest("1234") == digest("1234")
    assert digest("1234") != "1234"


def test_different_pins_produce_different_digests():
    """Different PINs must produce different digests."""
    assert digest("1234") != digest("5678")


def test_digest_returns_fixed_length_hex():
    """digest() should return a SHA-256 hex string (64 chars)."""
    result = digest("0000")
    assert isinstance(result, str)
    assert len(result) == 64


# ── Permission: ensure_gate ───────────────────────────────────────────────


def test_only_security_subtype_gets_gate_access():
    """Only support_staff with staff_type='Security' can use the gate."""
    ensure_gate(user("support_staff", "Security"))
    with pytest.raises(HTTPException):
        ensure_gate(user("support_staff", "Maintenance"))


def test_admin_passes_gate_via_operational_role():
    """Admins are also allowed gate access because ensure_gate checks is_operational."""
    # Per permissions.py: ensure_gate allows is_security OR is_operational
    ensure_gate(user("admin"))  # should NOT raise


def test_unknown_role_cannot_use_gate():
    """An unknown/invalid role gets no gate access."""
    with pytest.raises(HTTPException):
        ensure_gate(user("flat_owner"))


# ── Permission: ensure_resident ───────────────────────────────────────────


def test_only_resident_roles_create_guest_passes():
    """flat_owner should pass; security staff should not."""
    ensure_resident(user("flat_owner"))
    with pytest.raises(HTTPException):
        ensure_resident(user("support_staff", "Security"))


def test_rental_resident_can_create_guest_passes():
    """resident_rental should also be allowed to create guest passes."""
    ensure_resident(user("resident_rental"))


# ── pass_dict status logic ────────────────────────────────────────────────


def test_pass_status_prioritizes_revocation():
    """A revoked pass should show 'revoked' even if valid_until is in the future."""
    item = SimpleNamespace(
        id=1,
        guest_name="Guest",
        purpose="Visit",
        public_id="id",
        valid_until=datetime.now(timezone.utc) + timedelta(hours=1),
        used_at=None,
        revoked_at=datetime.now(timezone.utc),
    )
    assert pass_dict(item)["status"] == "revoked"


def test_pass_status_active_when_not_expired_or_revoked():
    """A pass with future valid_until and no revocation should be 'active'."""
    item = SimpleNamespace(
        id=2,
        guest_name="Guest2",
        purpose="Delivery",
        public_id="id2",
        valid_until=datetime.now(timezone.utc) + timedelta(hours=1),
        used_at=None,
        revoked_at=None,
    )
    assert pass_dict(item)["status"] == "active"


def test_pass_status_expired_when_past_valid_until():
    """A pass with valid_until in the past and no revocation should be 'expired'."""
    item = SimpleNamespace(
        id=3,
        guest_name="Guest3",
        purpose="Visit",
        public_id="id3",
        valid_until=datetime.now(timezone.utc) - timedelta(hours=1),
        used_at=None,
        revoked_at=None,
    )
    assert pass_dict(item)["status"] == "expired"
