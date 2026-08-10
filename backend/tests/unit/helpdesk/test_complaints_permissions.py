"""
tests/unit/helpdesk/test_complaints_permissions.py
Unit tests for helpdesk complaints permission guards.

Tests are pure Python — no HTTP, no database.
"""
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


# ── is_operational helper ──────────────────────────────────────────────────


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_are_recognized(role):
    """is_operational must return True for management roles."""
    assert is_operational(user_with_roles(role))


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental", "support_staff"])
def test_non_operational_roles_are_not_recognized(role):
    """is_operational must return False for non-management roles."""
    assert not is_operational(user_with_roles(role))


# ── ensure_can_create ──────────────────────────────────────────────────────


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental"])
def test_residents_can_create_complaints(role):
    """Resident roles must be permitted to create complaints."""
    ensure_can_create(user_with_roles(role))


def test_operational_roles_can_also_create_complaints():
    """Admins who are also community members should be able to create complaints."""
    # committee members are operational but can still file complaints
    ensure_can_create(user_with_roles("committee_member"))


def test_unknown_role_cannot_create_complaint():
    """An unrecognized role must be denied complaint creation."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_can_create(user_with_roles("unknown"))
    assert exc_info.value.status_code == 403


# ── ensure_operational ────────────────────────────────────────────────────


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental", "support_staff"])
def test_non_operational_roles_cannot_manage_complaints(role):
    """Residents and support staff must not be able to manage complaints."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_roles(role))
    assert exc_info.value.status_code == 403


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_manage_complaints(role):
    """Admin, super_admin, and committee_member must pass ensure_operational."""
    ensure_operational(user_with_roles(role))
