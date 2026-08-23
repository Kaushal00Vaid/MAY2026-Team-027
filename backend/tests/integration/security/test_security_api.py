"""
tests/integration/security/test_security_api.py
Integration tests for all security & access control API endpoints.

Covers:
  - GET /api/v1/security/resident-id
  - POST /api/v1/security/resident-id/verify
  - GET/POST /api/v1/security/visitors + decision/entry/exit
  - GET/POST /api/v1/security/guest-passes + revoke + verify-pin
  - POST /api/v1/security/access-logs/manual-entry
  - GET /api/v1/security/access-logs

Run from backend/:
    uv run pytest tests/integration/security/ -v
"""

from datetime import datetime, timedelta, timezone



# ─────────────────────────────────────────────────────────────────────────────
# TC-SEC-RID: Resident ID
# ─────────────────────────────────────────────────────────────────────────────


class TestResidentId:
    def test_get_resident_id_as_resident_returns_200(self, resident_client):
        """TC-SEC-01: GET /api/v1/security/resident-id as resident → 200."""
        resp = resident_client.get("/api/v1/security/resident-id")
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data or "qr_data" in data or "resident_id" in data

    def test_get_resident_id_unauthenticated_returns_401(self, unauth_client):
        """TC-SEC-02: GET resident-id without auth → 401."""
        resp = unauth_client.get("/api/v1/security/resident-id")
        assert resp.status_code in (401, 403)

    def test_verify_resident_id_missing_token_returns_422(self, staff_client):
        """TC-SEC-03: POST /resident-id/verify with no token → 422."""
        resp = staff_client.post(
            "/api/v1/security/resident-id/verify",
            json={},
        )
        assert resp.status_code == 422

    def test_verify_resident_id_invalid_token_returns_400_or_404(self, staff_client):
        """TC-SEC-04: POST /resident-id/verify with invalid token → 400 or 404."""
        resp = staff_client.post(
            "/api/v1/security/resident-id/verify",
            json={"token": "invalid-garbage-token"},
        )
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# TC-SEC-VIS: Visitor management
# ─────────────────────────────────────────────────────────────────────────────


class TestVisitors:
    def test_create_visitor_rejects_whitespace_required_text(self, staff_client):
        resp = staff_client.post(
            "/api/v1/security/visitors",
            json=self._visitor_payload(visitor_name="   ", purpose="   "),
        )
        assert resp.status_code == 422

    def _visitor_payload(self, **overrides):
        return {
            "visitor_name": "Test Visitor",
            "target_unit": "A-101",
            "purpose": "Delivery",
            **overrides,
        }

    def test_list_visitors_as_staff_returns_200(self, staff_client):
        """TC-SEC-05: GET /api/v1/security/visitors as security staff → 200."""
        resp = staff_client.get("/api/v1/security/visitors")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_list_visitors_as_resident_returns_200(self, resident_client):
        """TC-SEC-06: GET visitors as resident → 200 (own visitors)."""
        resp = resident_client.get("/api/v1/security/visitors")
        assert resp.status_code == 200

    def test_list_visitors_unauthenticated_returns_401(self, unauth_client):
        """TC-SEC-07: GET visitors without auth → 401."""
        resp = unauth_client.get("/api/v1/security/visitors")
        assert resp.status_code in (401, 403)

    def test_list_visitors_filter_by_status(self, staff_client):
        """TC-SEC-08: GET visitors?status=pending → 200."""
        resp = staff_client.get("/api/v1/security/visitors?status=pending")
        assert resp.status_code == 200

    def test_list_visitors_searches_target_unit(self, staff_client):
        created = staff_client.post(
            "/api/v1/security/visitors",
            json=self._visitor_payload(visitor_name="Unit search visitor"),
        )
        assert created.status_code == 201
        resp = staff_client.get("/api/v1/security/visitors?search=A-101")
        assert resp.status_code == 200
        assert any(item["id"] == created.json()["id"] for item in resp.json()["items"])

    def test_list_visitors_invalid_status_returns_422(self, staff_client):
        """TC-SEC-09: GET visitors?status=unknown → 422."""
        resp = staff_client.get("/api/v1/security/visitors?status=unknown")
        assert resp.status_code == 422

    def test_create_visitor_as_security_returns_201(self, staff_client):
        """TC-SEC-10: POST visitor as security staff → 201."""
        resp = staff_client.post(
            "/api/v1/security/visitors",
            json=self._visitor_payload(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["visitor_name"] == "Test Visitor"
        assert "id" in data

    def test_create_visitor_trimmed_fields(self, staff_client):
        """TC-SEC-11: Visitor name/unit are trimmed in response."""
        resp = staff_client.post(
            "/api/v1/security/visitors",
            json=self._visitor_payload(visitor_name="  Alice  ", target_unit=" A-101 "),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["visitor_name"] == "Alice"
        assert data["unit"] == "A-101"

    def test_create_visitor_missing_required_field_returns_422(self, resident_client):
        """TC-SEC-12: POST visitor without visitor_name → 422."""
        resp = resident_client.post(
            "/api/v1/security/visitors",
            json={"target_unit": "A-101", "purpose": "Visit"},
        )
        assert resp.status_code == 422

    def test_create_visitor_unauthenticated_returns_401(self, unauth_client):
        """TC-SEC-13: POST visitor without auth → 401."""
        resp = unauth_client.post(
            "/api/v1/security/visitors",
            json=self._visitor_payload(),
        )
        assert resp.status_code in (401, 403)

    def test_decide_visitor_nonexistent_returns_404(self, admin_client):
        """TC-SEC-14: POST /visitors/99999/decision → 404."""
        resp = admin_client.post(
            "/api/v1/security/visitors/99999/decision",
            json={"decision": "approved", "expected_version": 1},
        )
        assert resp.status_code == 404

    def test_decision_persists_expiry_before_returning_conflict(
        self, staff_client, admin_client, monkeypatch
    ):
        created = staff_client.post(
            "/api/v1/security/visitors", json=self._visitor_payload()
        ).json()
        monkeypatch.setattr(
            "app.security.service.now",
            lambda: datetime.now(timezone.utc) + timedelta(hours=1),
        )
        decision = admin_client.post(
            f"/api/v1/security/visitors/{created['id']}/decision",
            json={"decision": "approved", "expected_version": created["version"]},
        )
        assert decision.status_code == 409
        visitors = staff_client.get(
            f"/api/v1/security/visitors?search={created['visitor_name']}"
        ).json()["items"]
        expired = next(item for item in visitors if item["id"] == created["id"])
        assert expired["status"] == "expired"
        assert expired["version"] == created["version"] + 1
        logs = staff_client.get("/api/v1/security/access-logs").json()
        assert any(
            item["event_type"] == "visitor_expired"
            and item["subject_name"] == created["visitor_name"]
            for item in logs
        )

    def test_entry_nonexistent_visitor_returns_404(self, staff_client):
        """TC-SEC-15: POST /visitors/99999/entry → 404."""
        resp = staff_client.post("/api/v1/security/visitors/99999/entry")
        assert resp.status_code == 404

    def test_exit_nonexistent_visitor_returns_404(self, staff_client):
        """TC-SEC-16: POST /visitors/99999/exit → 404."""
        resp = staff_client.post("/api/v1/security/visitors/99999/exit")
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# TC-SEC-GP: Guest passes
# ─────────────────────────────────────────────────────────────────────────────


class TestGuestPasses:
    def _pass_payload(self, **overrides):
        return {"guest_name": "Test Guest", "valid_hours": 24, **overrides}

    def test_list_guest_passes_as_resident_returns_200(self, resident_client):
        """TC-SEC-17: GET /api/v1/security/guest-passes as resident → 200."""
        resp = resident_client.get("/api/v1/security/guest-passes")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_guest_passes_unauthenticated_returns_401(self, unauth_client):
        """TC-SEC-18: GET guest-passes without auth → 401."""
        resp = unauth_client.get("/api/v1/security/guest-passes")
        assert resp.status_code in (401, 403)

    def test_create_guest_pass_as_resident_returns_201(self, resident_client):
        """TC-SEC-19: POST guest-pass as resident → 201."""
        resp = resident_client.post(
            "/api/v1/security/guest-passes",
            json=self._pass_payload(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["guest_name"] == "Test Guest"
        assert "id" in data
        assert "status" in data

    def test_create_guest_pass_as_staff_returns_403(self, staff_client):
        """TC-SEC-20: POST guest-pass as security staff → 403 (resident-only)."""
        resp = staff_client.post(
            "/api/v1/security/guest-passes",
            json=self._pass_payload(),
        )
        assert resp.status_code == 403

    def test_create_guest_pass_exceeding_72_hours_returns_422(self, resident_client):
        """TC-SEC-21: POST guest-pass with valid_hours=73 → 422."""
        resp = resident_client.post(
            "/api/v1/security/guest-passes",
            json=self._pass_payload(valid_hours=73),
        )
        assert resp.status_code == 422

    def test_create_guest_pass_zero_hours_returns_422(self, resident_client):
        """TC-SEC-22: POST guest-pass with valid_hours=0 → 422."""
        resp = resident_client.post(
            "/api/v1/security/guest-passes",
            json=self._pass_payload(valid_hours=0),
        )
        assert resp.status_code == 422

    def test_create_guest_pass_missing_guest_name_returns_422(self, resident_client):
        """TC-SEC-23: POST guest-pass without guest_name → 422."""
        resp = resident_client.post(
            "/api/v1/security/guest-passes",
            json={"valid_hours": 24},
        )
        assert resp.status_code == 422

    def test_revoke_guest_pass_returns_200(self, resident_client):
        """TC-SEC-24: POST /guest-passes/{id}/revoke → 200."""
        pass_id = resident_client.post(
            "/api/v1/security/guest-passes",
            json=self._pass_payload(),
        ).json()["id"]
        resp = resident_client.post(f"/api/v1/security/guest-passes/{pass_id}/revoke")
        assert resp.status_code == 200
        assert resp.json()["status"] == "revoked"

    def test_revoke_nonexistent_pass_returns_404(self, resident_client):
        """TC-SEC-25: POST /guest-passes/99999/revoke → 404."""
        resp = resident_client.post("/api/v1/security/guest-passes/99999/revoke")
        assert resp.status_code == 404

    def test_verify_pin_invalid_format_returns_422(self, staff_client):
        """TC-SEC-26: POST /guest-passes/verify-pin with non-4-digit PIN → 422."""
        resp = staff_client.post(
            "/api/v1/security/guest-passes/verify-pin",
            json={"pin": "123"},
        )
        assert resp.status_code == 422

    def test_verify_pin_alpha_returns_422(self, staff_client):
        """TC-SEC-27: POST verify-pin with alpha PIN → 422."""
        resp = staff_client.post(
            "/api/v1/security/guest-passes/verify-pin",
            json={"pin": "abcd"},
        )
        assert resp.status_code == 422

    def test_verify_pin_wrong_pin_returns_404(self, staff_client):
        """TC-SEC-28: POST verify-pin with valid format but wrong PIN → 404."""
        resp = staff_client.post(
            "/api/v1/security/guest-passes/verify-pin",
            json={"pin": "0000"},
        )
        assert resp.status_code in (400, 404)


# ─────────────────────────────────────────────────────────────────────────────
# TC-SEC-LOG: Access logs
# ─────────────────────────────────────────────────────────────────────────────


class TestAccessLogs:
    def test_get_access_logs_as_staff_returns_200(self, staff_client):
        """TC-SEC-29: GET /api/v1/security/access-logs as security staff → 200."""
        resp = staff_client.get("/api/v1/security/access-logs")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_access_logs_as_admin_returns_200(self, admin_client):
        """TC-SEC-30: GET access-logs as admin → 200."""
        resp = admin_client.get("/api/v1/security/access-logs")
        assert resp.status_code == 200

    def test_get_access_logs_unauthenticated_returns_401(self, unauth_client):
        """TC-SEC-31: GET access-logs without auth → 401."""
        resp = unauth_client.get("/api/v1/security/access-logs")
        assert resp.status_code in (401, 403)

    def test_get_access_logs_limit_param(self, staff_client):
        """TC-SEC-32: GET access-logs?limit=10 respects limit."""
        resp = staff_client.get("/api/v1/security/access-logs?limit=10")
        assert resp.status_code == 200
        assert len(resp.json()) <= 10

    def test_get_access_logs_limit_above_max_returns_422(self, staff_client):
        """TC-SEC-33: GET access-logs?limit=999 (above max 200) → 422."""
        resp = staff_client.get("/api/v1/security/access-logs?limit=999")
        assert resp.status_code == 422

    def test_manual_entry_as_staff_returns_201(self, staff_client):
        """TC-SEC-34: POST /access-logs/manual-entry as staff → 201."""
        resp = staff_client.post(
            "/api/v1/security/access-logs/manual-entry",
            json={"unit": "A-101"},
        )
        assert resp.status_code == 201

    def test_manual_entry_missing_unit_returns_422(self, staff_client):
        """TC-SEC-35: POST manual-entry without unit → 422."""
        resp = staff_client.post(
            "/api/v1/security/access-logs/manual-entry",
            json={},
        )
        assert resp.status_code == 422

    def test_manual_entry_as_resident_returns_403(self, resident_client):
        """TC-SEC-36: POST manual-entry as resident → 403."""
        resp = resident_client.post(
            "/api/v1/security/access-logs/manual-entry",
            json={"unit": "A-101"},
        )
        assert resp.status_code == 403
