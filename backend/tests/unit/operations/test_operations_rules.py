"""
tests/unit/operations/test_operations_rules.py
Unit tests for operations module permissions and schema validation.

Tests are pure Python — no HTTP, no database.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.operations.permissions import ensure_ops, ensure_staff, ensure_staff_or_ops
from app.operations.schemas import ItemCreate, MovementCreate, ShiftCreate, TaskCreate


def user_with_role(role):
    return SimpleNamespace(
        roles=[
            SimpleNamespace(role=SimpleNamespace(role_name=SimpleNamespace(value=role)))
        ]
    )


# ── Permission: ensure_staff_or_ops ───────────────────────────────────────


@pytest.mark.parametrize(
    "role", ["support_staff", "super_admin", "admin", "committee_member"]
)
def test_staff_and_operational_roles_access_operations(role):
    """Both staff and operational roles should be permitted to access operations."""
    ensure_staff_or_ops(user_with_role(role))


def test_resident_cannot_access_operations():
    """Residents (flat_owner) must not access the operations module."""
    with pytest.raises(HTTPException) as exc:
        ensure_staff_or_ops(user_with_role("flat_owner"))
    assert exc.value.status_code == 403


def test_rental_resident_cannot_access_operations():
    """Rental residents must also be denied operations access."""
    with pytest.raises(HTTPException) as exc:
        ensure_staff_or_ops(user_with_role("resident_rental"))
    assert exc.value.status_code == 403


# ── Permission: ensure_ops ────────────────────────────────────────────────


def test_only_operational_roles_manage_roster():
    """Support staff must not be able to manage the roster via ensure_ops."""
    with pytest.raises(HTTPException) as exc:
        ensure_ops(user_with_role("support_staff"))
    assert exc.value.status_code == 403


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_manage_roster(role):
    """Admin and committee roles must pass ensure_ops."""
    ensure_ops(user_with_role(role))


# ── Permission: ensure_staff ──────────────────────────────────────────────


def test_only_staff_records_personal_attendance():
    """support_staff should pass ensure_staff; committee_member should not."""
    ensure_staff(user_with_role("support_staff"))
    with pytest.raises(HTTPException) as exc:
        ensure_staff(user_with_role("committee_member"))
    assert exc.value.status_code == 403


def test_admin_cannot_log_personal_attendance():
    """Admins cannot use the staff-only attendance toggle."""
    with pytest.raises(HTTPException) as exc:
        ensure_staff(user_with_role("admin"))
    assert exc.value.status_code == 403


# ── Schema: TaskCreate ────────────────────────────────────────────────────


def test_blank_task_values_are_rejected():
    """TaskCreate with whitespace-only title and location must be rejected."""
    with pytest.raises(ValidationError):
        TaskCreate(title="  ", location="  ")


def test_valid_task_create():
    """A properly filled TaskCreate should not raise."""
    t = TaskCreate(title="Inspect Generator", location="Basement")
    assert t.title == "Inspect Generator"


# ── Schema: ItemCreate ────────────────────────────────────────────────────


def test_inventory_quantities_cannot_be_negative():
    """ItemCreate with initial_quantity < 0 must be rejected."""
    with pytest.raises(ValidationError):
        ItemCreate(
            name="Bleach", category="Cleaning", unit_symbol="L", initial_quantity=-1
        )


def test_inventory_zero_quantity_accepted():
    """Zero initial_quantity should be a valid starting state."""
    item = ItemCreate(
        name="Bleach", category="Cleaning", unit_symbol="L", initial_quantity=0
    )
    assert item.initial_quantity == 0


# ── Schema: MovementCreate ────────────────────────────────────────────────


def test_stock_movements_must_be_positive_and_explained():
    """A zero-quantity movement with no note must be rejected."""
    with pytest.raises(ValidationError):
        MovementCreate(movement_type="consumed", quantity=0, note="")


def test_valid_movement_create():
    """A positive quantity with a note should be accepted."""
    m = MovementCreate(movement_type="consumed", quantity=5, note="Used for cleaning")
    assert m.quantity == 5


# ── Schema: ShiftCreate ───────────────────────────────────────────────────


def test_shift_days_mask_is_bounded():
    """days_mask=128 is out of the 0-127 range (7 bits for Mon-Sun)."""
    with pytest.raises(ValidationError):
        ShiftCreate(
            staff_id=1,
            role_label="Security",
            start_time="09:00",
            end_time="17:00",
            days_mask=128,
        )


def test_valid_shift_create():
    """A shift with a valid 7-day mask (e.g. 0b1111111=127) should pass."""
    s = ShiftCreate(
        staff_id=1,
        role_label="Security",
        start_time="09:00",
        end_time="17:00",
        days_mask=127,
    )
    assert s.days_mask == 127
