"""
tests/integration/users/test_users_api.py
Integration tests for /users/* API endpoints.

Covers listing users, getting own profile, and patching user roles.
Role-based access control is verified via dependency_overrides.

Run from backend/:
    uv run pytest tests/integration/users/ -v
"""

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# TC-USR: User management
# ─────────────────────────────────────────────────────────────────────────────


class TestListUsers:
    def test_list_users_as_resident_forbidden(self, resident_client):
        """TC-USR-01: GET /users/ as flat_owner → 403 Forbidden."""
        resp = resident_client.get("/users/")
        assert resp.status_code == 403

    def test_list_users_as_admin_forbidden(self, admin_client):
        """TC-USR-02: GET /users/ as admin is also forbidden (super_admin only)."""
        resp = admin_client.get("/users/")
        assert resp.status_code == 403

    def test_list_users_as_super_admin_returns_200(self, super_admin_client):
        """TC-USR-03: GET /users/ as super_admin → 200 with a list."""
        resp = super_admin_client.get("/users/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_users_without_auth_returns_401(self, unauth_client):
        """TC-USR-04: GET /users/ unauthenticated → 401."""
        resp = unauth_client.get("/users/")
        assert resp.status_code in (401, 403)

    def test_list_users_response_shape(self, super_admin_client):
        """TC-USR-05: Each user in the list must have expected fields."""
        resp = super_admin_client.get("/users/")
        assert resp.status_code == 200
        users = resp.json()
        if users:
            user = users[0]
            assert "user_id" in user
            assert "email" in user

    def test_list_users_pagination_skip(self, super_admin_client):
        """TC-USR-06: GET /users/?skip=0&limit=5 should respect pagination."""
        resp = super_admin_client.get("/users/?skip=0&limit=5")
        assert resp.status_code == 200
        assert len(resp.json()) <= 5

    def test_list_users_invalid_limit_returns_422(self, super_admin_client):
        """TC-USR-07: Limit above max (200) must return 422."""
        resp = super_admin_client.get("/users/?limit=999")
        assert resp.status_code == 422


class TestGetMe:
    def test_get_me_as_resident_returns_200(self, resident_client):
        """TC-USR-08: GET /users/me as authenticated resident → 200."""
        resp = resident_client.get("/users/me")
        assert resp.status_code == 200
        data = resp.json()
        assert "user_id" in data
        assert "email" in data

    def test_get_me_as_admin_returns_200(self, admin_client):
        """TC-USR-09: GET /users/me as admin → 200."""
        resp = admin_client.get("/users/me")
        assert resp.status_code == 200

    def test_get_me_without_auth_returns_401(self, unauth_client):
        """TC-USR-10: GET /users/me unauthenticated → 401."""
        resp = unauth_client.get("/users/me")
        assert resp.status_code in (401, 403)


class TestPatchUserRole:
    def test_patch_role_nonexistent_user_returns_404(self, super_admin_client):
        """TC-USR-11: PATCH /users/99999/role with non-existent user → 404."""
        resp = super_admin_client.patch(
            "/users/99999/role",
            json={"role_name": "flat_owner"},
        )
        assert resp.status_code == 404

    def test_patch_role_invalid_role_name_returns_422(self, super_admin_client):
        """TC-USR-12: PATCH /users/1/role with unknown role → 422."""
        resp = super_admin_client.patch(
            "/users/1/role",
            json={"role_name": "god_mode"},
        )
        assert resp.status_code == 422

    def test_patch_role_as_resident_forbidden(self, resident_client):
        """TC-USR-13: PATCH /users/1/role as resident → 403."""
        resp = resident_client.patch(
            "/users/1/role",
            json={"role_name": "flat_owner"},
        )
        assert resp.status_code == 403

    def test_patch_role_without_auth_returns_401(self, unauth_client):
        """TC-USR-14: PATCH /users/1/role unauthenticated → 401."""
        resp = unauth_client.patch(
            "/users/1/role",
            json={"role_name": "flat_owner"},
        )
        assert resp.status_code in (401, 403)
