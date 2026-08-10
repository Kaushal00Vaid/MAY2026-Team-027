"""
tests/test_all_apis.py
======================
Comprehensive pytest suite for SocietySync API — Sprint 1.

Covers:
  - Authentication  : signup, password-login, OTP request/verify, refresh, logout, /me
  - Users           : list users, patch role
  - Helpdesk        : create/list/get/update complaint, add/get comments
  - Finance         : create/list transactions, validation edge cases

All protected endpoints use FastAPI dependency_overrides to bypass real JWT
auth so the tests remain deterministic and do not require a live DB with seeded
credentials.

Run from the backend/ directory:
    uv run pytest tests/test_all_apis.py -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user
from app.db.models.user import User

# ─────────────────────────────────────────────────────────────────────────────
# Shared mock users
# ─────────────────────────────────────────────────────────────────────────────

def _mock_resident():
    """Simulates a regular flat-owner (resident)."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=4, role_name=RoleName.flat_owner)
    assignment = UserRole(user_id=1, role_id=4)
    assignment.role = role
    user = User(
        user_id=1,
        first_name="Alice",
        last_name="Resident",
        phone_number="+911234567890",
        email="alice@test.com",
        is_active=True,
        is_phone_verified=True,
    )
    user.roles = [assignment]
    return user


def _mock_admin():
    """Simulates an admin user (for finance / user management)."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=2, role_name=RoleName.admin)
    ur = UserRole(user_id=1, role_id=2)
    ur.role = role
    u = User(
        user_id=1,
        first_name="Bob",
        last_name="Admin",
        phone_number="+919999999999",
        email="admin@test.com",
        is_active=True,
        is_phone_verified=True,
    )
    u.roles = [ur]
    return u


def _mock_super_admin():
    """Simulates a super-admin user."""
    from app.db.models.role import Role, UserRole, RoleName
    role = Role(role_id=1, role_name=RoleName.super_admin)
    ur = UserRole(user_id=1, role_id=1)
    ur.role = role
    u = User(
        user_id=1,
        first_name="Carl",
        last_name="Super",
        phone_number="+918888888888",
        email="super@test.com",
        is_active=True,
        is_phone_verified=True,
    )
    u.roles = [ur]
    return u


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def resident_client():
    """TestClient with resident-level auth override."""
    app.dependency_overrides[get_current_user] = _mock_resident
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_client():
    """TestClient with admin-level auth override (for finance & users)."""
    app.dependency_overrides[get_current_user] = _mock_admin
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def super_admin_client():
    """TestClient with super-admin auth override."""
    app.dependency_overrides[get_current_user] = _mock_super_admin
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def unauth_client():
    """TestClient with no auth overrides (simulates unauthenticated requests)."""
    app.dependency_overrides.pop(get_current_user, None)
    return TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-01  Health check
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_root_health(self, unauth_client):
        """TC-AUTH-01: GET / returns 200 with API-running message."""
        resp = unauth_client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

    def test_health_endpoint(self, unauth_client):
        """TC-AUTH-02: GET /health returns 200 healthy."""
        resp = unauth_client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-03  Signup
# ─────────────────────────────────────────────────────────────────────────────

class TestSignup:
    BASE = "/auth/signup"

    def test_signup_valid(self, unauth_client):
        """TC-AUTH-03: POST /auth/signup with valid data creates user (201)."""
        import time
        unique = int(time.time())
        resp = unauth_client.post(
            self.BASE,
            json={
                "first_name": "John",
                "last_name": "Doe",
                "email": f"john{unique}@test.com",
                "phone_number": f"+9187654{unique % 100000:05d}",
                "password": "Secure@123",
                "confirm_password": "Secure@123",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["message"] == "Account created. You can now log in."
        assert "user_id" in data

    def test_signup_password_mismatch(self, unauth_client):
        """TC-AUTH-04: POST /auth/signup with mismatched passwords returns 422."""
        resp = unauth_client.post(
            self.BASE,
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "phone_number": "+919123456781",
                "password": "Secure@123",
                "confirm_password": "WrongPass",
            },
        )
        assert resp.status_code == 422

    def test_signup_short_password(self, unauth_client):
        """TC-AUTH-05: POST /auth/signup with <8-char password returns 422."""
        resp = unauth_client.post(
            self.BASE,
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "phone_number": "+919123456782",
                "password": "abc",
                "confirm_password": "abc",
            },
        )
        assert resp.status_code == 422

    def test_signup_invalid_phone(self, unauth_client):
        """TC-AUTH-06: POST /auth/signup with invalid phone format returns 422."""
        resp = unauth_client.post(
            self.BASE,
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "phone_number": "123",
            },
        )
        assert resp.status_code == 422

    def test_signup_missing_required_fields(self, unauth_client):
        """TC-AUTH-07: POST /auth/signup with missing required fields returns 422."""
        resp = unauth_client.post(self.BASE, json={"first_name": "Only"})
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-08  Password Login
# ─────────────────────────────────────────────────────────────────────────────

class TestPasswordLogin:
    BASE = "/auth/login/password"

    def test_login_invalid_credentials(self, unauth_client):
        """TC-AUTH-08: POST /auth/login/password with wrong credentials -> 401."""
        resp = unauth_client.post(
            self.BASE,
            json={"email": "nonexistent@test.com", "password": "WrongPass123"},
        )
        assert resp.status_code in (401, 404)

    def test_login_missing_email(self, unauth_client):
        """TC-AUTH-09: POST /auth/login/password with no email -> 422."""
        resp = unauth_client.post(
            self.BASE, json={"password": "Secure@123"}
        )
        assert resp.status_code == 422

    def test_login_invalid_email_format(self, unauth_client):
        """TC-AUTH-10: POST /auth/login/password with malformed email -> 422."""
        resp = unauth_client.post(
            self.BASE, json={"email": "not-an-email", "password": "Secure@123"}
        )
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-11  OTP
# ─────────────────────────────────────────────────────────────────────────────

class TestOTP:
    def test_otp_request_unknown_phone(self, unauth_client):
        """TC-AUTH-11: Unknown phones receive a generic 401 to prevent enumeration."""
        resp = unauth_client.post(
            "/auth/otp/request",
            json={"phone_number": "+919000000000"},
        )
        assert resp.status_code == 401

    def test_otp_verify_invalid_code_format(self, unauth_client):
        """TC-AUTH-12: POST /auth/otp/verify with non-numeric OTP -> 422."""
        resp = unauth_client.post(
            "/auth/otp/verify",
            json={"phone_number": "+919000000000", "otp_code": "ABCDEF"},
        )
        assert resp.status_code == 422

    def test_otp_verify_short_code(self, unauth_client):
        """TC-AUTH-13: POST /auth/otp/verify with <6 digit OTP -> 422."""
        resp = unauth_client.post(
            "/auth/otp/verify",
            json={"phone_number": "+919000000000", "otp_code": "123"},
        )
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-14  Token Refresh & Logout
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenRefreshLogout:
    def test_refresh_without_cookie(self, unauth_client):
        """TC-AUTH-14: POST /auth/refresh with no cookie -> 401."""
        resp = unauth_client.post("/auth/refresh")
        assert resp.status_code == 401

    def test_logout_without_cookie(self, unauth_client):
        """TC-AUTH-15: POST /auth/logout with no cookie -> 200 (graceful)."""
        resp = unauth_client.post("/auth/logout")
        assert resp.status_code == 200

    def test_get_me_no_token(self, unauth_client):
        """TC-AUTH-16: GET /auth/me without Bearer token -> 403 or 401."""
        resp = unauth_client.get("/auth/me")
        assert resp.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# TC-USR-01  Users (require super_admin / admin)
# ─────────────────────────────────────────────────────────────────────────────

class TestUsers:
    def test_list_users_as_resident_forbidden(self, resident_client):
        """TC-USR-01: GET /users/ as resident -> 403 Forbidden."""
        resp = resident_client.get("/users/")
        assert resp.status_code == 403

    def test_list_users_as_super_admin(self, super_admin_client):
        """TC-USR-02: GET /users/ as super_admin -> 200 with list."""
        resp = super_admin_client.get("/users/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_patch_role_nonexistent_user(self, super_admin_client):
        """TC-USR-03: PATCH /users/99999/role for non-existent user -> 404."""
        resp = super_admin_client.patch(
            "/users/99999/role",
            json={"role_name": "flat_owner"},
        )
        assert resp.status_code == 404

    def test_patch_role_invalid_role_name(self, super_admin_client):
        """TC-USR-04: PATCH /users/1/role with invalid role name -> 422."""
        resp = super_admin_client.patch(
            "/users/1/role",
            json={"role_name": "god_mode"},
        )
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TC-HD-01  Helpdesk Complaints
# ─────────────────────────────────────────────────────────────────────────────

class TestHelpdesk:
    def test_create_complaint_valid(self, resident_client):
        """TC-HD-01: POST /api/helpdesk/complaints with valid data -> 201."""
        resp = resident_client.post(
            "/api/helpdesk/complaints",
            json={
                "title": "Water Leakage",
                "category": "Plumbing",
                "description": "Pipe burst in Block A lobby",
                "priority": "High",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Water Leakage"
        assert data["status"] == "Open"
        assert data["priority"] == "High"
        assert "id" in data

    def test_create_complaint_missing_category(self, resident_client):
        """TC-HD-02: POST /api/helpdesk/complaints without category -> 422."""
        resp = resident_client.post(
            "/api/helpdesk/complaints",
            json={"description": "No category provided"},
        )
        assert resp.status_code == 422

    def test_get_all_complaints(self, resident_client):
        """TC-HD-03: GET /api/helpdesk/complaints -> 200 with list."""
        resp = resident_client.get("/api/helpdesk/complaints")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_single_complaint(self, resident_client):
        """TC-HD-04: GET /api/helpdesk/complaints/{id} -> 200 with complaint."""
        create = resident_client.post(
            "/api/helpdesk/complaints",
            json={"category": "Electrical", "description": "Street light out"},
        )
        assert create.status_code == 201
        cid = create.json()["id"]
        resp = resident_client.get(f"/api/helpdesk/complaints/{cid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == cid

    def test_get_nonexistent_complaint(self, resident_client):
        """TC-HD-05: GET /api/helpdesk/complaints/99999 -> 404."""
        resp = resident_client.get("/api/helpdesk/complaints/99999")
        assert resp.status_code == 404

    def test_resident_cannot_update_complaint_status(self, resident_client):
        """TC-HD-06: Residents cannot perform operational status transitions."""
        create = resident_client.post(
            "/api/helpdesk/complaints",
            json={"category": "Maintenance", "description": "Lift not working"},
        )
        cid = create.json()["id"]
        resp = resident_client.patch(
            f"/api/helpdesk/complaints/{cid}",
            json={"status": "In Progress", "expected_version": create.json()["version"]},
        )
        assert resp.status_code == 403

    def test_update_complaint_invalid_status(self, resident_client):
        """TC-HD-07: Invalid statuses are rejected by the API schema."""
        create = resident_client.post(
            "/api/helpdesk/complaints",
            json={"category": "Security", "description": "CCTV offline"},
        )
        cid = create.json()["id"]
        resp = resident_client.patch(
            f"/api/helpdesk/complaints/{cid}",
            json={"status": "Done", "expected_version": create.json()["version"]},
        )
        assert resp.status_code == 422
        resp2 = resident_client.patch(
            f"/api/helpdesk/complaints/{cid}",
            json={"status": "", "expected_version": create.json()["version"]},
        )
        assert resp2.status_code == 422

    def test_create_complaint_unauthenticated(self, unauth_client):
        """TC-HD-08: POST /api/helpdesk/complaints without auth -> 403."""
        resp = unauth_client.post(
            "/api/helpdesk/complaints",
            json={"category": "Test", "description": "No auth"},
        )
        assert resp.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# TC-HD-09  Helpdesk Comments
# ─────────────────────────────────────────────────────────────────────────────

class TestHelpdeskComments:
    def _create_complaint(self, client) -> int:
        r = client.post(
            "/api/helpdesk/complaints",
            json={"category": "Noise", "description": "Loud music at night"},
        )
        return r.json()["id"]

    def test_add_comment(self, resident_client):
        """TC-HD-09: POST /api/helpdesk/complaints/{id}/comments -> 201."""
        cid = self._create_complaint(resident_client)
        resp = resident_client.post(
            f"/api/helpdesk/complaints/{cid}/comments",
            json={"body": "Acknowledged, will investigate."},
        )
        assert resp.status_code == 201
        assert resp.json()["body"] == "Acknowledged, will investigate."

    def test_add_comment_empty_body(self, resident_client):
        """TC-HD-10: POST comment with empty body -> 422."""
        cid = self._create_complaint(resident_client)
        resp = resident_client.post(
            f"/api/helpdesk/complaints/{cid}/comments",
            json={"body": ""},
        )
        assert resp.status_code == 422

    def test_get_comments(self, resident_client):
        """TC-HD-11: GET /api/helpdesk/complaints/{id}/comments -> 200 list."""
        cid = self._create_complaint(resident_client)
        resident_client.post(
            f"/api/helpdesk/complaints/{cid}/comments",
            json={"body": "First comment"},
        )
        resp = resident_client.get(f"/api/helpdesk/complaints/{cid}/comments")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_get_comments_nonexistent_complaint(self, resident_client):
        """TC-HD-12: GET comments for non-existent complaint -> 404."""
        resp = resident_client.get("/api/helpdesk/complaints/99999/comments")
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# TC-FIN-01  Finance Transactions
# ─────────────────────────────────────────────────────────────────────────────

class TestFinance:
    """Finance endpoints require admin/super_admin/committee_member role."""

    def _tx(self, client, type_="income", amount=500.00):
        return client.post(
            "/api/finance/transactions",
            json={
                "unit_or_vendor": "A-101",
                "category": "Maintenance",
                "amount": amount,
                "type": type_,
            },
        )

    def test_create_income_transaction(self, admin_client):
        """TC-FIN-01: POST /api/finance/transactions income -> 201."""
        resp = self._tx(admin_client, "income", 1500.00)
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "income"
        assert float(data["amount"]) == 1500.00
        assert data["unit_or_vendor"] == "A-101"

    def test_create_expense_transaction(self, admin_client):
        """TC-FIN-02: POST /api/finance/transactions expense -> 201."""
        resp = self._tx(admin_client, "expense", 750.00)
        assert resp.status_code == 201
        assert resp.json()["type"] == "expense"

    def test_list_transactions(self, admin_client):
        """TC-FIN-03: GET /api/finance/transactions -> 200 with list."""
        self._tx(admin_client)
        resp = admin_client.get("/api/finance/transactions")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_filter_income(self, admin_client):
        """TC-FIN-04: GET ?type=income returns only income records."""
        self._tx(admin_client, "income")
        self._tx(admin_client, "expense")
        resp = admin_client.get("/api/finance/transactions?type=income")
        assert resp.status_code == 200
        for tx in resp.json():
            assert tx["type"] == "income"

    def test_filter_expense(self, admin_client):
        """TC-FIN-05: GET ?type=expense returns only expense records."""
        self._tx(admin_client, "income")
        self._tx(admin_client, "expense")
        resp = admin_client.get("/api/finance/transactions?type=expense")
        assert resp.status_code == 200
        for tx in resp.json():
            assert tx["type"] == "expense"

    def test_pagination(self, admin_client):
        """TC-FIN-06: GET ?limit=2&offset=0 respects pagination."""
        for _ in range(3):
            self._tx(admin_client)
        resp = admin_client.get("/api/finance/transactions?limit=2&offset=0")
        assert resp.status_code == 200
        assert len(resp.json()) <= 2

    def test_create_zero_amount(self, admin_client):
        """TC-FIN-07: POST with amount=0 -> 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01", "category": "Test", "amount": 0, "type": "income"},
        )
        assert resp.status_code == 422

    def test_create_negative_amount(self, admin_client):
        """TC-FIN-08: POST with negative amount -> 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01", "category": "Test", "amount": -100, "type": "income"},
        )
        assert resp.status_code == 422

    def test_create_invalid_type(self, admin_client):
        """TC-FIN-09: POST with type='refund' -> 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01", "category": "Test", "amount": 100, "type": "refund"},
        )
        assert resp.status_code == 422

    def test_create_missing_fields(self, admin_client):
        """TC-FIN-10: POST with missing required fields -> 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01"},
        )
        assert resp.status_code == 422

    def test_finance_forbidden_for_resident(self, resident_client):
        """TC-FIN-11: POST finance as resident -> 403 Forbidden."""
        resp = self._tx(resident_client)
        assert resp.status_code == 403

    def test_filter_invalid_type_param(self, admin_client):
        """TC-FIN-12: GET ?type=cash (invalid filter value) -> 422."""
        resp = admin_client.get("/api/finance/transactions?type=cash")
        assert resp.status_code == 422
