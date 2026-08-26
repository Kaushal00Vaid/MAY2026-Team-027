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

from datetime import datetime, time, timedelta, timezone

from app.amenities.models import Amenity, AmenityBooking
from app.community.models import CommunityEvent, Notice
from app.db.models.user import User
from app.db.database import get_db
from app.main import app
from app.security.models import Visitor



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

    def test_dashboard_notices_are_scoped_and_unexpired(self, resident_client):
        session = next(app.dependency_overrides[get_db]())
        now = datetime.now(timezone.utc)
        session.add_all([
            Notice(title="Global", body="Visible", target_type="all", is_active=True),
            Notice(title="Own block", body="Visible", target_type="block", target_value="a", is_active=True),
            Notice(title="Own flat", body="Visible", target_type="flat", target_value="A-101", is_active=True),
            Notice(title="Other block", body="Hidden", target_type="block", target_value="B", is_active=True),
            Notice(title="Other flat", body="Hidden", target_type="flat", target_value="A-102", is_active=True),
            Notice(title="Expired", body="Hidden", target_type="all", expires_at=now - timedelta(minutes=1), is_active=True),
            Notice(title="Inactive", body="Hidden", target_type="all", is_active=False),
        ])
        session.commit()

        response = resident_client.get("/api/v1/analytics/resident")

        assert response.status_code == 200
        titles = {item["title"] for item in response.json()["notices"]}
        assert {"Global", "Own block", "Own flat"}.issubset(titles)
        assert titles.isdisjoint({"Other block", "Other flat", "Expired", "Inactive"})

    def test_dashboard_notice_includes_creator_name_with_management_fallback(self, resident_client):
        session = next(app.dependency_overrides[get_db]())
        creator = User(
            first_name="Priya",
            last_name="Menon",
            email="analytics-notice-creator@example.com",
            flat_number="A-101",
            building_block="A",
            is_active=True,
        )
        session.add(creator)
        session.flush()
        session.add_all([
            Notice(title="Named notice", body="Created by resident manager", target_type="all", created_by=creator.user_id, is_active=True),
            Notice(title="System notice", body="No creator", target_type="all", created_by=None, is_active=True),
        ])
        session.commit()

        response = resident_client.get("/api/v1/analytics/resident")

        assert response.status_code == 200
        notices = {item["title"]: item for item in response.json()["notices"]}
        assert notices["Named notice"]["from_author"] == "Priya Menon"
        assert notices["System notice"]["from_author"] == "Management"

    def test_dashboard_excludes_ended_bookings_and_formats_society_time(self, resident_client):
        session = next(app.dependency_overrides[get_db]())
        now = datetime.now(timezone.utc)
        amenity = Amenity(
            name="Dashboard timezone amenity",
            description="Analytics regression fixture",
            capacity=2,
            operating_start=time(0, 0),
            operating_end=time(23, 59),
            slot_minutes=60,
            weekly_limit=5,
        )
        session.add(amenity)
        session.flush()
        session.add_all([
            AmenityBooking(
                amenity_id=amenity.id,
                resident_id=9_000_001,
                starts_at=now - timedelta(hours=2),
                ends_at=now - timedelta(hours=1),
                purpose="Ended booking",
                status="confirmed",
                idempotency_key="dashboard-ended-booking",
            ),
            AmenityBooking(
                amenity_id=amenity.id,
                resident_id=9_000_001,
                starts_at=now - timedelta(minutes=15),
                ends_at=now + timedelta(minutes=15),
                purpose="Current booking",
                status="confirmed",
                idempotency_key="dashboard-current-booking",
            ),
        ])
        utc_event_start = (now + timedelta(days=2)).replace(hour=20, minute=0, second=0, microsecond=0)
        session.add(CommunityEvent(
            title="Timezone boundary event",
            description="Date changes in India",
            location="Clubhouse",
            starts_at=utc_event_start,
            ends_at=utc_event_start + timedelta(hours=1),
            is_active=True,
        ))
        session.commit()

        response = resident_client.get("/api/v1/analytics/resident")

        assert response.status_code == 200
        data = response.json()
        booking_titles = {item["title"] for item in data["bookings"]}
        assert "Current booking" in booking_titles
        assert "Ended booking" not in booking_titles
        event = next(item for item in data["events"] if item["title"] == "Timezone boundary event")
        expected_local = utc_event_start.astimezone(timezone(timedelta(hours=5, minutes=30)))
        assert event["date_str"] == expected_local.strftime("%d %b %Y")
        assert event["time_str"] == "01:30"


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

    def test_pending_approvals_exclude_expired_requests(self, staff_client):
        before = staff_client.get("/api/v1/analytics/staff")
        assert before.status_code == 200
        initial_count = before.json()["gate_activity"]["pending_approvals"]
        session = next(app.dependency_overrides[get_db]())
        current_time = datetime.now(timezone.utc)
        session.add_all([
            Visitor(
                resident_id=9_000_001,
                visitor_name="Active dashboard visitor",
                purpose="Delivery",
                status="pending",
                expires_at=current_time + timedelta(minutes=10),
            ),
            Visitor(
                resident_id=9_000_001,
                visitor_name="Expired dashboard visitor",
                purpose="Delivery",
                status="pending",
                expires_at=current_time - timedelta(minutes=10),
            ),
        ])
        session.commit()

        response = staff_client.get("/api/v1/analytics/staff")

        assert response.status_code == 200
        assert response.json()["gate_activity"]["pending_approvals"] == initial_count + 1


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

    def test_explicit_unavailable_amenity_returns_404(self, admin_client):
        resp = admin_client.get("/api/v1/analytics/advanced?amenity_id=999999")
        assert resp.status_code == 404


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

    def test_export_uses_selected_amenity(self, admin_client):
        created = admin_client.post(
            "/api/v1/amenities",
            json={"name": "Export Selection Gym", "slot_minutes": 60},
        )
        assert created.status_code == 201
        amenity_id = created.json()["id"]

        resp = admin_client.get(f"/api/v1/analytics/export?amenity_id={amenity_id}")
        assert resp.status_code == 200
        assert "Amenity Utilization,Export Selection Gym" in resp.text

    def test_export_rejects_unavailable_amenity(self, admin_client):
        resp = admin_client.get("/api/v1/analytics/export?amenity_id=999999")
        assert resp.status_code == 404
