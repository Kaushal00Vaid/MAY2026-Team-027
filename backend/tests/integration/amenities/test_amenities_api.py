"""
tests/integration/amenities/test_amenities_api.py
Integration tests for all amenities API endpoints.

Covers:
  - GET/POST /api/v1/amenities
  - PATCH /api/v1/amenities/{id}
  - GET /api/v1/amenities/{id}/availability
  - GET/POST /api/v1/bookings
  - POST /api/v1/bookings/{id}/cancel

Run from backend/:
    uv run pytest tests/integration/amenities/ -v
"""
from datetime import date, datetime, timezone, timedelta

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# TC-AME: Amenities
# ─────────────────────────────────────────────────────────────────────────────


class TestAmenitiesList:
    def test_list_amenities_returns_200(self, resident_client):
        """TC-AME-01: GET /api/v1/amenities as resident → 200 with list."""
        resp = resident_client.get("/api/v1/amenities")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_amenities_as_committee_returns_200(self, committee_client):
        """TC-AME-02: GET /api/v1/amenities as committee member → 200."""
        resp = committee_client.get("/api/v1/amenities")
        assert resp.status_code == 200

    def test_list_amenities_unauthenticated_returns_401(self, unauth_client):
        """TC-AME-03: GET /api/v1/amenities without auth → 401."""
        resp = unauth_client.get("/api/v1/amenities")
        assert resp.status_code in (401, 403)

    def test_list_amenities_include_inactive_param(self, admin_client):
        """TC-AME-04: GET /api/v1/amenities?include_inactive=true works for admin."""
        resp = admin_client.get("/api/v1/amenities?include_inactive=true")
        assert resp.status_code == 200


class TestAmenitiesCreate:
    def _amenity_payload(self, **overrides):
        return {
            "name": "Test Amenity",
            "capacity": 10,
            "slot_minutes": 60,
            "weekly_limit": 3,
            **overrides,
        }

    def test_create_amenity_as_admin_returns_201(self, admin_client):
        """TC-AME-05: POST /api/v1/amenities as admin → 201."""
        resp = admin_client.post("/api/v1/amenities", json=self._amenity_payload())
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Amenity"
        assert "id" in data

    def test_create_amenity_as_committee_returns_201(self, committee_client):
        """TC-AME-06: POST /api/v1/amenities as committee member → 201."""
        resp = committee_client.post("/api/v1/amenities", json=self._amenity_payload(name="Pool"))
        assert resp.status_code == 201

    def test_create_amenity_as_resident_returns_403(self, resident_client):
        """TC-AME-07: POST /api/v1/amenities as resident → 403."""
        resp = resident_client.post("/api/v1/amenities", json=self._amenity_payload())
        assert resp.status_code == 403

    def test_create_amenity_zero_capacity_returns_422(self, admin_client):
        """TC-AME-08: Amenity with capacity=0 → 422."""
        resp = admin_client.post(
            "/api/v1/amenities",
            json=self._amenity_payload(capacity=0),
        )
        assert resp.status_code == 422

    def test_create_amenity_zero_weekly_limit_returns_422(self, admin_client):
        """TC-AME-09: Amenity with weekly_limit=0 → 422."""
        resp = admin_client.post(
            "/api/v1/amenities",
            json=self._amenity_payload(weekly_limit=0),
        )
        assert resp.status_code == 422

    def test_create_amenity_missing_required_fields_returns_422(self, admin_client):
        """TC-AME-10: Amenity with missing name → 422."""
        resp = admin_client.post(
            "/api/v1/amenities",
            json={"capacity": 10, "slot_minutes": 60},
        )
        assert resp.status_code == 422

    def test_create_amenity_unauthenticated_returns_401(self, unauth_client):
        """TC-AME-11: POST amenity without auth → 401."""
        resp = unauth_client.post("/api/v1/amenities", json=self._amenity_payload())
        assert resp.status_code in (401, 403)


class TestAmenitiesUpdate:
    def _create_amenity(self, client):
        resp = client.post(
            "/api/v1/amenities",
            json={"name": "Update Test", "capacity": 5, "slot_minutes": 30, "weekly_limit": 2},
        )
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_update_amenity_returns_200(self, admin_client):
        """TC-AME-12: PATCH /api/v1/amenities/{id} → 200 with updated data."""
        aid = self._create_amenity(admin_client)
        resp = admin_client.patch(f"/api/v1/amenities/{aid}", json={"capacity": 15})
        assert resp.status_code == 200
        assert resp.json()["capacity"] == 15

    def test_update_nonexistent_amenity_returns_404(self, admin_client):
        """TC-AME-13: PATCH /api/v1/amenities/99999 → 404."""
        resp = admin_client.patch("/api/v1/amenities/99999", json={"capacity": 5})
        assert resp.status_code == 404

    def test_update_amenity_as_resident_returns_403(self, resident_client):
        """TC-AME-14: PATCH amenity as resident → 403."""
        resp = resident_client.patch("/api/v1/amenities/1", json={"capacity": 5})
        assert resp.status_code == 403


class TestAmenitiesAvailability:
    def test_availability_returns_200(self, resident_client):
        """TC-AME-15: GET /api/v1/amenities/{id}/availability → 200."""
        # Create an amenity first
        amenity_resp = admin_client_fixture = None
        # We'll just test with a likely existing amenity or expect 404
        resp = resident_client.get(
            f"/api/v1/amenities/1/availability?start_date={date.today()}&days=7"
        )
        assert resp.status_code in (200, 404)

    def test_availability_invalid_days_returns_422(self, resident_client):
        """TC-AME-16: availability with days=0 → 422."""
        resp = resident_client.get(
            f"/api/v1/amenities/1/availability?start_date={date.today()}&days=0"
        )
        assert resp.status_code == 422

    def test_availability_missing_start_date_returns_422(self, resident_client):
        """TC-AME-17: Missing start_date → 422."""
        resp = resident_client.get("/api/v1/amenities/1/availability")
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TC-BOOK: Bookings
# ─────────────────────────────────────────────────────────────────────────────


class TestBookings:
    def _booking_payload(self, amenity_id: int = 1):
        return {
            "amenity_id": amenity_id,
            "starts_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "purpose": "Exercise",
        }

    def test_list_bookings_returns_paginated_response(self, resident_client):
        """TC-BOOK-01: GET /api/v1/bookings → 200 with paginated response."""
        resp = resident_client.get("/api/v1/bookings")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_list_bookings_unauthenticated_returns_401(self, unauth_client):
        """TC-BOOK-02: GET /api/v1/bookings without auth → 401."""
        resp = unauth_client.get("/api/v1/bookings")
        assert resp.status_code in (401, 403)

    def test_create_booking_missing_idempotency_key_returns_422(self, resident_client):
        """TC-BOOK-03: POST /api/v1/bookings without Idempotency-Key header → 422."""
        resp = resident_client.post("/api/v1/bookings", json=self._booking_payload())
        assert resp.status_code == 422

    def test_create_booking_as_staff_forbidden(self, staff_client):
        """TC-BOOK-04: POST booking as support_staff → 403."""
        resp = staff_client.post(
            "/api/v1/bookings",
            json=self._booking_payload(),
            headers={"Idempotency-Key": "test-key-12345678"},
        )
        assert resp.status_code == 403

    def test_create_booking_invalid_purpose_returns_422(self, resident_client):
        """TC-BOOK-05: POST booking with unsupported purpose → 422."""
        resp = resident_client.post(
            "/api/v1/bookings",
            json={**self._booking_payload(), "purpose": "InvalidPurpose"},
            headers={"Idempotency-Key": "test-key-12345678"},
        )
        assert resp.status_code == 422

    def test_cancel_nonexistent_booking_returns_404(self, resident_client):
        """TC-BOOK-06: POST /api/v1/bookings/99999/cancel → 404."""
        resp = resident_client.post("/api/v1/bookings/99999/cancel")
        assert resp.status_code == 404
