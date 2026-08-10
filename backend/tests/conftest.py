"""
tests/conftest.py — Shared pytest fixtures for unit and integration tests.

Provides mock user factories and TestClient fixtures for all API modules.
All protected endpoints use FastAPI dependency_overrides to bypass real JWT
auth, making tests deterministic and DB-agnostic.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user
from app.db.models.user import User


# ─────────────────────────────────────────────────────────────────────────────
# Mock user factories
# ─────────────────────────────────────────────────────────────────────────────


def _make_resident(user_id: int = 1) -> User:
    """Simulates a regular flat_owner (resident member)."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=5, role_name=RoleName.flat_owner)
    ur = UserRole(user_id=user_id, role_id=5)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Alice",
        last_name="Resident",
        phone_number="+911234567890",
        email="alice@test.com",
        is_active=True,
        is_phone_verified=True,
        flat_number="A-101",
        building_block="A",
    )
    u.roles = [ur]
    return u


def _make_admin(user_id: int = 99) -> User:
    """Simulates an admin user."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=2, role_name=RoleName.admin)
    ur = UserRole(user_id=user_id, role_id=2)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Bob",
        last_name="Admin",
        phone_number="+919999999999",
        email="admin@test.com",
        is_active=True,
        is_phone_verified=True,
    )
    u.roles = [ur]
    return u


def _make_super_admin(user_id: int = 100) -> User:
    """Simulates a super_admin user."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=1, role_name=RoleName.super_admin)
    ur = UserRole(user_id=user_id, role_id=1)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Carl",
        last_name="Super",
        phone_number="+918888888888",
        email="super@test.com",
        is_active=True,
        is_phone_verified=True,
    )
    u.roles = [ur]
    return u


def _make_committee_member(user_id: int = 101) -> User:
    """Simulates a committee_member user."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=3, role_name=RoleName.committee_member)
    ur = UserRole(user_id=user_id, role_id=3)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Diana",
        last_name="Committee",
        phone_number="+917777777777",
        email="committee@test.com",
        is_active=True,
        is_phone_verified=True,
    )
    u.roles = [ur]
    return u


def _make_support_staff(user_id: int = 102, staff_type: str = "Security") -> User:
    """Simulates a support_staff user."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=4, role_name=RoleName.support_staff)
    ur = UserRole(user_id=user_id, role_id=4)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Eve",
        last_name="Staff",
        phone_number="+916666666666",
        email="staff@test.com",
        is_active=True,
        is_phone_verified=True,
        staff_type=staff_type,
    )
    u.roles = [ur]
    return u


# ─────────────────────────────────────────────────────────────────────────────
# Pytest fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def resident_client():
    """TestClient authenticated as a flat_owner resident."""
    app.dependency_overrides[get_current_user] = _make_resident
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client():
    """TestClient authenticated as an admin."""
    app.dependency_overrides[get_current_user] = _make_admin
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def super_admin_client():
    """TestClient authenticated as a super_admin."""
    app.dependency_overrides[get_current_user] = _make_super_admin
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def committee_client():
    """TestClient authenticated as a committee_member."""
    app.dependency_overrides[get_current_user] = _make_committee_member
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def staff_client():
    """TestClient authenticated as support_staff (Security sub-type)."""
    def _mock():
        return _make_support_staff(staff_type="Security")
    app.dependency_overrides[get_current_user] = _mock
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def maintenance_staff_client():
    """TestClient authenticated as support_staff (Maintenance sub-type)."""
    def _mock():
        return _make_support_staff(staff_type="Maintenance")
    app.dependency_overrides[get_current_user] = _mock
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client():
    """TestClient with NO auth overrides (simulates unauthenticated requests)."""
    app.dependency_overrides.clear()
    return TestClient(app)
