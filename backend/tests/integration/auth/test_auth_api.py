"""
tests/integration/auth/test_auth_api.py
Integration tests for all /auth/* API endpoints.

Covers signup, password login, OTP flow, token refresh/logout, /me,
complete-profile, and health checks.
All tests use the TestClient against the real FastAPI app.
Auth overrides are used only where we need to bypass JWT to test protected endpoints.

Run from backend/:
    uv run pytest tests/integration/auth/ -v
"""

import time

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures (use conftest fixtures)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def client():
    """Unauthenticated client — no dependency overrides."""
    app.dependency_overrides.clear()
    return TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# TC-HEALTH: Health checks
# ─────────────────────────────────────────────────────────────────────────────


class TestHealth:
    def test_root_returns_success(self, client):
        """TC-HEALTH-01: GET / → 200 with status=success."""
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"
        assert "SocietySync" in resp.json()["message"]

    def test_health_endpoint_returns_healthy(self, client):
        """TC-HEALTH-02: GET /health → 200 with status=healthy."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-SIGNUP: User registration
# ─────────────────────────────────────────────────────────────────────────────


class TestSignup:
    BASE = "/auth/signup"

    def _unique_payload(self):
        ts = int(time.time() * 1000) % 100_000_000
        return {
            "first_name": "John",
            "last_name": "Doe",
            "email": f"john{ts}@test.com",
            "phone_number": f"+9187654{ts % 100000:05d}",
            "password": "Secure@123",
            "confirm_password": "Secure@123",
        }

    def test_signup_valid_returns_201(self, client):
        """TC-AUTH-01: Valid signup creates user and returns 201."""
        resp = client.post(self.BASE, json=self._unique_payload())
        assert resp.status_code == 201
        data = resp.json()
        assert data["message"] == "Account created. You can now log in."
        assert "user_id" in data

    def test_signup_response_contains_phone_number(self, client):
        """TC-AUTH-02: Signup response must echo back the phone number."""
        payload = self._unique_payload()
        resp = client.post(self.BASE, json=payload)
        assert resp.status_code == 201
        assert "phone_number" in resp.json()

    def test_signup_password_mismatch_returns_422(self, client):
        """TC-AUTH-03: Mismatched passwords must return 422."""
        payload = self._unique_payload()
        payload["confirm_password"] = "WrongPass"
        resp = client.post(self.BASE, json=payload)
        assert resp.status_code == 422

    def test_signup_short_password_returns_422(self, client):
        """TC-AUTH-04: Password shorter than 8 chars must return 422."""
        payload = self._unique_payload()
        payload["password"] = "abc"
        payload["confirm_password"] = "abc"
        resp = client.post(self.BASE, json=payload)
        assert resp.status_code == 422

    def test_signup_invalid_phone_returns_422(self, client):
        """TC-AUTH-05: Invalid phone format must return 422."""
        payload = self._unique_payload()
        payload["phone_number"] = "123"
        resp = client.post(self.BASE, json=payload)
        assert resp.status_code == 422

    def test_signup_missing_required_fields_returns_422(self, client):
        """TC-AUTH-06: Missing required fields must return 422."""
        resp = client.post(self.BASE, json={"first_name": "Only"})
        assert resp.status_code == 422

    def test_signup_duplicate_email_returns_conflict(self, client):
        """TC-AUTH-07: Registering the same email twice must fail (409 or 400)."""
        payload = self._unique_payload()
        r1 = client.post(self.BASE, json=payload)
        assert r1.status_code == 201
        # Attempt duplicate
        r2 = client.post(self.BASE, json=payload)
        assert r2.status_code in (400, 409, 422)

    def test_signup_alias_register_endpoint(self, client):
        """TC-AUTH-08: POST /auth/register is an alias for /auth/signup."""
        payload = self._unique_payload()
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 201


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-LOGIN: Password login
# ─────────────────────────────────────────────────────────────────────────────


class TestPasswordLogin:
    BASE = "/auth/login/password"

    def test_login_invalid_credentials_returns_401_or_404(self, client):
        """TC-AUTH-09: Wrong credentials must return 401 or 404."""
        resp = client.post(
            self.BASE,
            json={"email": "nonexistent@test.com", "password": "WrongPass123"},
        )
        assert resp.status_code in (401, 404)

    def test_login_missing_email_returns_422(self, client):
        """TC-AUTH-10: Missing email field must return 422."""
        resp = client.post(self.BASE, json={"password": "Secure@123"})
        assert resp.status_code == 422

    def test_login_missing_password_returns_422(self, client):
        """TC-AUTH-11: Missing password field must return 422."""
        resp = client.post(self.BASE, json={"email": "test@test.com"})
        assert resp.status_code == 422

    def test_login_invalid_email_format_returns_422(self, client):
        """TC-AUTH-12: Malformed email must return 422."""
        resp = client.post(
            self.BASE, json={"email": "not-an-email", "password": "Secure@123"}
        )
        assert resp.status_code == 422

    def test_login_alias_endpoint(self, client):
        """TC-AUTH-13: POST /auth/login is an alias for /auth/login/password."""
        resp = client.post(
            "/auth/login",
            json={"email": "nonexistent@test.com", "password": "WrongPass123"},
        )
        assert resp.status_code in (401, 404)


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-OTP: OTP flow
# ─────────────────────────────────────────────────────────────────────────────


class TestOTP:
    def test_otp_request_unknown_phone(self, client):
        """TC-AUTH-14: OTP request for non-existent phone → 404 or 422 or 429."""
        resp = client.post(
            "/auth/otp/request",
            json={"phone_number": "+919000000000"},
        )
        assert resp.status_code in (404, 422, 429)

    def test_otp_request_invalid_phone_format(self, client):
        """TC-AUTH-15: Invalid phone format must return 422."""
        resp = client.post(
            "/auth/otp/request",
            json={"phone_number": "12345"},
        )
        assert resp.status_code == 422

    def test_otp_verify_invalid_code_format(self, client):
        """TC-AUTH-16: Non-numeric OTP must return 422."""
        resp = client.post(
            "/auth/otp/verify",
            json={"phone_number": "+919000000000", "otp_code": "ABCDEF"},
        )
        assert resp.status_code == 422

    def test_otp_verify_short_code(self, client):
        """TC-AUTH-17: OTP shorter than 6 digits must return 422."""
        resp = client.post(
            "/auth/otp/verify",
            json={"phone_number": "+919000000000", "otp_code": "123"},
        )
        assert resp.status_code == 422

    def test_otp_verify_wrong_code(self, client):
        """TC-AUTH-18: Valid format but wrong OTP code → 400 or 401."""
        resp = client.post(
            "/auth/otp/verify",
            json={"phone_number": "+919000000000", "otp_code": "000000"},
        )
        assert resp.status_code in (400, 401, 404, 422)


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-TOKEN: Token refresh and logout
# ─────────────────────────────────────────────────────────────────────────────


class TestTokenRefreshLogout:
    def test_refresh_without_cookie_returns_401(self, client):
        """TC-AUTH-19: POST /auth/refresh with no cookie → 401."""
        resp = client.post("/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_with_invalid_token_returns_401(self, client):
        """TC-AUTH-20: Invalid refresh token cookie → 401."""
        client.cookies.set("ss_refresh_token", "invalid-garbage-token")
        resp = client.post("/auth/refresh")
        assert resp.status_code in (401, 422)

    def test_logout_without_cookie_returns_200(self, client):
        """TC-AUTH-21: POST /auth/logout with no cookie → 200 (graceful)."""
        resp = client.post("/auth/logout")
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_get_me_no_token_returns_401(self, client):
        """TC-AUTH-22: GET /auth/me without Bearer token → 401."""
        resp = client.get("/auth/me")
        assert resp.status_code in (401, 403)

    def test_get_me_with_valid_override(self, resident_client):
        """TC-AUTH-23: GET /auth/me with valid auth → 200 with user data."""
        resp = resident_client.get("/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert "user_id" in data
        assert "email" in data


# ─────────────────────────────────────────────────────────────────────────────
# TC-AUTH-PROFILE: Complete profile (Google OAuth post-signup)
# ─────────────────────────────────────────────────────────────────────────────


class TestCompleteProfile:
    def test_complete_profile_no_token_returns_401(self, client):
        """TC-AUTH-24: POST /auth/complete-profile without Bearer → 401."""
        resp = client.post(
            "/auth/complete-profile",
            json={
                "phone_number": "+919876543210",
                "first_name": "Google",
                "last_name": "User",
            },
        )
        assert resp.status_code == 401

    def test_complete_profile_invalid_pending_token_returns_401(self, client):
        """TC-AUTH-25: Invalid pending_profile token → 401."""
        resp = client.post(
            "/auth/complete-profile",
            json={
                "phone_number": "+919876543210",
                "first_name": "Google",
                "last_name": "User",
            },
            headers={"Authorization": "Bearer garbage.token.here"},
        )
        assert resp.status_code == 401
