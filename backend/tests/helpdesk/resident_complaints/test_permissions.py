from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.helpdesk.complaints.permissions import (
    ensure_can_create,
    ensure_operational,
    is_operational,
)


def user_with_roles(*roles):
    assignments = [
        SimpleNamespace(role=SimpleNamespace(role_name=SimpleNamespace(value=role)))
        for role in roles
    ]
    return SimpleNamespace(user_id=1, roles=assignments)


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_are_recognized(role):
    assert is_operational(user_with_roles(role))


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental"])
def test_residents_can_create_complaints(role):
    ensure_can_create(user_with_roles(role))


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental", "support_staff"])
def test_non_operational_roles_cannot_manage_complaints(role):
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_roles(role))
    assert exc_info.value.status_code == 403


def test_unknown_role_cannot_create_complaint():
    with pytest.raises(HTTPException) as exc_info:
        ensure_can_create(user_with_roles("unknown"))
    assert exc_info.value.status_code == 403

