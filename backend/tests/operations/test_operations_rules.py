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


@pytest.mark.parametrize(
    "role", ["support_staff", "super_admin", "admin", "committee_member"]
)
def test_staff_and_operational_roles_access_operations(role):
    ensure_staff_or_ops(user_with_role(role))


def test_resident_cannot_access_operations():
    with pytest.raises(HTTPException) as exc:
        ensure_staff_or_ops(user_with_role("flat_owner"))
    assert exc.value.status_code == 403


def test_only_operational_roles_manage_roster():
    with pytest.raises(HTTPException) as exc:
        ensure_ops(user_with_role("support_staff"))
    assert exc.value.status_code == 403


def test_only_staff_records_personal_attendance():
    ensure_staff(user_with_role("support_staff"))
    with pytest.raises(HTTPException) as exc:
        ensure_staff(user_with_role("committee_member"))
    assert exc.value.status_code == 403


def test_blank_task_values_are_rejected():
    with pytest.raises(ValidationError):
        TaskCreate(title="  ", location="  ")


def test_inventory_quantities_cannot_be_negative():
    with pytest.raises(ValidationError):
        ItemCreate(
            name="Bleach", category="Cleaning", unit_symbol="L", initial_quantity=-1
        )


def test_stock_movements_must_be_positive_and_explained():
    with pytest.raises(ValidationError):
        MovementCreate(movement_type="consumed", quantity=0, note="")


def test_shift_days_mask_is_bounded():
    with pytest.raises(ValidationError):
        ShiftCreate(
            staff_id=1,
            role_label="Security",
            start_time="09:00",
            end_time="17:00",
            days_mask=128,
        )
