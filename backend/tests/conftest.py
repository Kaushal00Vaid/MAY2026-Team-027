"""
tests/conftest.py — Shared pytest fixtures for unit and integration tests.

Provides mock user factories and TestClient fixtures for all API modules.
All protected endpoints use FastAPI dependency_overrides to bypass real JWT
auth, making tests deterministic and DB-agnostic.
"""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.dependencies import get_current_user
from app.db.database import engine, get_db
from app.db.models.role import UserRole
from app.db.models.user import User


RESIDENT_ID = 9_000_001
ADMIN_ID = 9_000_002
SUPER_ADMIN_ID = 9_000_003
COMMITTEE_ID = 9_000_004
STAFF_ID = 9_000_005


def pytest_collection_modifyitems(items):
    """Tag tests from their physical suite so `pytest -m` matches directory runs."""
    for item in items:
        if "unit" in item.path.parts:
            item.add_marker(pytest.mark.unit)
        elif "integration" in item.path.parts:
            item.add_marker(pytest.mark.integration)


# ─────────────────────────────────────────────────────────────────────────────
# Mock user factories
# ─────────────────────────────────────────────────────────────────────────────


def _make_resident(user_id: int = RESIDENT_ID) -> User:
    """Simulates a regular flat_owner (resident member)."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=4, role_name=RoleName.flat_owner)
    ur = UserRole(user_id=user_id, role_id=4)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Alice",
        last_name="Resident",
        phone_number="+911234567890",
        email="alice@test.com",
        is_active=True,
        is_phone_verified=True,
        is_profile_complete=True,
        flat_number="A-101",
        building_block="A",
        created_at=datetime.now(timezone.utc),
    )
    u.roles = [ur]
    return u


def _make_admin(user_id: int = ADMIN_ID) -> User:
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
        is_profile_complete=True,
        created_at=datetime.now(timezone.utc),
    )
    u.roles = [ur]
    return u


def _make_super_admin(user_id: int = SUPER_ADMIN_ID) -> User:
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
        is_profile_complete=True,
        created_at=datetime.now(timezone.utc),
    )
    u.roles = [ur]
    return u


def _make_committee_member(user_id: int = COMMITTEE_ID) -> User:
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
        is_profile_complete=True,
        created_at=datetime.now(timezone.utc),
    )
    u.roles = [ur]
    return u


def _make_support_staff(user_id: int = STAFF_ID, staff_type: str = "Security") -> User:
    """Simulates a support_staff user."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=6, role_name=RoleName.support_staff)
    ur = UserRole(user_id=user_id, role_id=6)
    ur.role = role
    u = User(
        user_id=user_id,
        first_name="Eve",
        last_name="Staff",
        phone_number="+916666666666",
        email="staff@test.com",
        is_active=True,
        is_phone_verified=True,
        is_profile_complete=True,
        staff_type=staff_type,
        created_at=datetime.now(timezone.utc),
    )
    u.roles = [ur]
    return u


# ─────────────────────────────────────────────────────────────────────────────
# Pytest fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def isolated_integration_database(request):
    """Run every HTTP integration test in a transaction that is always rolled back."""
    if "integration" not in request.node.path.parts:
        yield
        return

    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    users = [
        (_make_resident(), 4),
        (_make_admin(), 2),
        (_make_super_admin(), 1),
        (_make_committee_member(), 3),
        (_make_support_staff(), 6),
    ]
    for mock_user, role_id in users:
        session.add(User(
            user_id=mock_user.user_id,
            first_name=mock_user.first_name,
            last_name=mock_user.last_name,
            phone_number=mock_user.phone_number,
            email=mock_user.email,
            is_active=True,
            is_phone_verified=True,
            is_profile_complete=True,
            flat_number=mock_user.flat_number,
            building_block=mock_user.building_block,
            staff_type=mock_user.staff_type,
        ))
        session.add(UserRole(user_id=mock_user.user_id, role_id=role_id))
    session.commit()

    def _get_test_db():
        yield session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def resident_client():
    """TestClient authenticated as a flat_owner resident."""
    app.dependency_overrides[get_current_user] = _make_resident
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_client():
    """TestClient authenticated as an admin."""
    app.dependency_overrides[get_current_user] = _make_admin
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def super_admin_client():
    """TestClient authenticated as a super_admin."""
    app.dependency_overrides[get_current_user] = _make_super_admin
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def committee_client():
    """TestClient authenticated as a committee_member."""
    app.dependency_overrides[get_current_user] = _make_committee_member
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def staff_client():
    """TestClient authenticated as support_staff (Security sub-type)."""
    def _mock():
        return _make_support_staff(staff_type="Security")
    app.dependency_overrides[get_current_user] = _mock
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def maintenance_staff_client():
    """TestClient authenticated as support_staff (Maintenance sub-type)."""
    def _mock():
        return _make_support_staff(staff_type="Maintenance")
    app.dependency_overrides[get_current_user] = _mock
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def unauth_client():
    """TestClient with NO auth overrides (simulates unauthenticated requests)."""
    app.dependency_overrides.pop(get_current_user, None)
    return TestClient(app)
