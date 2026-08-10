"""
tests/integration/analytics/test_analytics_api.py
Integration tests for all analytics API endpoints.

Covers:
  - GET /api/v1/analytics/admin
  - GET /api/v1/analytics/resident
  - GET /api/v1/analytics/staff
  - GET /api/v1/analytics/advanced
  - GET /api/v1/analytics/export (CSV)

Run from backend/:
    uv run pytest tests/integration/analytics/ -v
"""



# ─────────────────────────────────────────────────────────────────────────────
# TC-ANA: Analytics endpoints
# ─────────────────────────────────────────────────────────────────────────────


class TestAdminAnalytics:
    def test_admin_analytics_as_admin_returns_200(self, admin_client):
        """TC-ANA-01: GET /api/v1/analytics/admin as admin → 200."""
        resp = admin_client.get("/api/v1/analytics/admin")
        assert resp.status_code == 200

    def test_admin_analytics_as_committee_returns_200(self, committee_client):
        """TC-ANA-02: GET admin analytics as committee member → 200."""
        resp = committee_client.get("/api/v1/analytics/admin")
        assert resp.status_code == 200

    def test_admin_analytics_as_super_admin_returns_200(self, super_admin_client):
        """TC-ANA-03: GET admin analytics as super_admin → 200."""
        resp = super_admin_client.get("/api/v1/analytics/admin")
        assert resp.status_code == 200

    def test_admin_analytics_as_resident_returns_403(self, resident_client):
        """TC-ANA-04: GET admin analytics as flat_owner → 403."""
        resp = resident_client.get("/api/v1/analytics/admin")
        assert resp.status_code == 403

    def test_admin_analytics_as_staff_returns_403(self, staff_client):
        """TC-ANA-05: GET admin analytics as support_staff → 403."""
        resp = staff_client.get("/api/v1/analytics/admin")
        assert resp.status_code == 403

    def test_admin_analytics_unauthenticated_returns_401(self, unauth_client):
        """TC-ANA-06: GET admin analytics without auth → 401."""
        resp = unauth_client.get("/api/v1/analytics/admin")
        assert resp.status_code in (401, 403)

    def test_admin_analytics_response_shape(self, admin_client):
        """TC-ANA-07: Admin analytics response must be a JSON object."""
        resp = admin_client.get("/api/v1/analytics/admin")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)


class TestResidentAnalytics:
    def test_resident_analytics_as_resident_returns_200(self, resident_client):
        """TC-ANA-08: GET /api/v1/analytics/resident as flat_owner → 200."""
        resp = resident_client.get("/api/v1/analytics/resident")
        assert resp.status_code == 200

    def test_resident_analytics_as_admin_returns_403(self, admin_client):
        """TC-ANA-09: GET resident analytics as admin → 403 (role mismatch)."""
        resp = admin_client.get("/api/v1/analytics/resident")
        assert resp.status_code == 403

    def test_resident_analytics_as_staff_returns_403(self, staff_client):
        """TC-ANA-10: GET resident analytics as support_staff → 403."""
        resp = staff_client.get("/api/v1/analytics/resident")
        assert resp.status_code == 403

    def test_resident_analytics_unauthenticated_returns_401(self, unauth_client):
        """TC-ANA-11: GET resident analytics without auth → 401."""
        resp = unauth_client.get("/api/v1/analytics/resident")
        assert resp.status_code in (401, 403)

    def test_resident_analytics_response_shape(self, resident_client):
        """TC-ANA-12: Resident analytics response must be a JSON object."""
        resp = resident_client.get("/api/v1/analytics/resident")
        assert resp.status_code == 200
        assert isinstance(resp.json(), dict)


class TestStaffAnalytics:
    def test_staff_analytics_as_staff_returns_200(self, staff_client):
        """TC-ANA-13: GET /api/v1/analytics/staff as support_staff → 200."""
        resp = staff_client.get("/api/v1/analytics/staff")
        assert resp.status_code == 200

    def test_staff_analytics_as_admin_returns_200(self, admin_client):
        """TC-ANA-14: GET staff analytics as admin → 200."""
        resp = admin_client.get("/api/v1/analytics/staff")
        assert resp.status_code == 200

    def test_staff_analytics_as_resident_returns_403(self, resident_client):
        """TC-ANA-15: GET staff analytics as flat_owner → 403."""
        resp = resident_client.get("/api/v1/analytics/staff")
        assert resp.status_code == 403

    def test_staff_analytics_unauthenticated_returns_401(self, unauth_client):
        """TC-ANA-16: GET staff analytics without auth → 401."""
        resp = unauth_client.get("/api/v1/analytics/staff")
        assert resp.status_code in (401, 403)

    def test_staff_analytics_response_shape(self, staff_client):
        """TC-ANA-17: Staff analytics response must be a JSON object."""
        resp = staff_client.get("/api/v1/analytics/staff")
        assert resp.status_code == 200
        assert isinstance(resp.json(), dict)


class TestAdvancedAnalytics:
    def test_advanced_analytics_as_admin_returns_200(self, admin_client):
        """TC-ANA-18: GET /api/v1/analytics/advanced as admin → 200."""
        resp = admin_client.get("/api/v1/analytics/advanced")
        assert resp.status_code == 200

    def test_advanced_analytics_as_committee_returns_200(self, committee_client):
        """TC-ANA-19: GET advanced analytics as committee member → 200."""
        resp = committee_client.get("/api/v1/analytics/advanced")
        assert resp.status_code == 200

    def test_advanced_analytics_as_resident_returns_403(self, resident_client):
        """TC-ANA-20: GET advanced analytics as resident → 403."""
        resp = resident_client.get("/api/v1/analytics/advanced")
        assert resp.status_code == 403

    def test_advanced_analytics_response_shape(self, admin_client):
        """TC-ANA-21: Advanced analytics response must be a JSON object."""
        resp = admin_client.get("/api/v1/analytics/advanced")
        assert resp.status_code == 200
        assert isinstance(resp.json(), dict)


class TestAnalyticsExport:
    def test_export_as_admin_returns_csv(self, admin_client):
        """TC-ANA-22: GET /api/v1/analytics/export as admin → 200 CSV."""
        resp = admin_client.get("/api/v1/analytics/export")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    def test_export_as_committee_returns_csv(self, committee_client):
        """TC-ANA-23: GET analytics/export as committee → 200 CSV."""
        resp = committee_client.get("/api/v1/analytics/export")
        assert resp.status_code == 200

    def test_export_as_resident_returns_403(self, resident_client):
        """TC-ANA-24: GET analytics/export as resident → 403."""
        resp = resident_client.get("/api/v1/analytics/export")
        assert resp.status_code == 403

    def test_export_as_staff_returns_403(self, staff_client):
        """TC-ANA-25: GET analytics/export as support_staff → 403."""
        resp = staff_client.get("/api/v1/analytics/export")
        assert resp.status_code == 403

    def test_export_unauthenticated_returns_401(self, unauth_client):
        """TC-ANA-26: GET analytics/export without auth → 401."""
        resp = unauth_client.get("/api/v1/analytics/export")
        assert resp.status_code in (401, 403)

    def test_export_csv_has_content_disposition(self, admin_client):
        """TC-ANA-27: CSV export response includes Content-Disposition header."""
        resp = admin_client.get("/api/v1/analytics/export")
        assert resp.status_code == 200
        assert "content-disposition" in resp.headers
        assert "analytics_export.csv" in resp.headers["content-disposition"]
