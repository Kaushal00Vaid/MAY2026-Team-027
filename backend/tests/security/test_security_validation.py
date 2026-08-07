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


def test_visitor_fields_are_trimmed():
    value = VisitorCreate(
        visitor_name="  Maya  ", target_unit=" A-101 ", purpose=" Delivery "
    )
    assert value.visitor_name == "Maya"
    assert value.target_unit == "A-101"


@pytest.mark.parametrize("pin", ["123", "12345", "12a4", ""])
def test_guest_pin_requires_exactly_four_digits(pin):
    with pytest.raises(ValidationError):
        PinVerify(pin=pin)


def test_guest_pass_duration_is_bounded():
    with pytest.raises(ValidationError):
        GuestPassCreate(guest_name="Guest", valid_hours=73)


def test_pin_digest_is_deterministic_and_not_plaintext():
    assert digest("1234") == digest("1234")
    assert digest("1234") != "1234"


def test_only_security_subtype_gets_gate_access():
    ensure_gate(user("support_staff", "Security"))
    with pytest.raises(HTTPException):
        ensure_gate(user("support_staff", "Maintenance"))


def test_only_resident_roles_create_guest_passes():
    ensure_resident(user("flat_owner"))
    with pytest.raises(HTTPException):
        ensure_resident(user("support_staff", "Security"))


def test_pass_status_prioritizes_revocation():
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
