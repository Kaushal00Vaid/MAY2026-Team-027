"""
tests/integration/operations/test_operations_api.py
Integration tests for all staff operations API endpoints.

Covers:
  - GET /api/v1/operations/staff
  - GET/POST /api/v1/operations/tasks + PATCH
  - GET/POST /api/v1/operations/inventory + movements + export
  - GET/POST /api/v1/operations/shifts + status + export
  - GET/POST /api/v1/operations/attendance

Run from backend/:
    uv run pytest tests/integration/operations/ -v
"""

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _create_task(client, **overrides):
    payload = {
        "title": "Test Task",
        "location": "Block A",
        **overrides,
    }
    return client.post("/api/v1/operations/tasks", json=payload)


def _create_item(client, **overrides):
    payload = {
        "name": "Test Item",
        "category": "Cleaning",
        "unit_symbol": "L",
        "initial_quantity": 10,
        **overrides,
    }
    return client.post("/api/v1/operations/inventory", json=payload)


def _create_shift(client, staff_id: int = 1, **overrides):
    payload = {
        "staff_id": staff_id,
        "role_label": "Security",
        "start_time": "09:00",
        "end_time": "17:00",
        "days_mask": 31,  # Mon-Fri
        **overrides,
    }
    return client.post("/api/v1/operations/shifts", json=payload)


# ─────────────────────────────────────────────────────────────────────────────
# TC-OPS-STAFF: Staff listing
# ─────────────────────────────────────────────────────────────────────────────


class TestStaff:
    def test_list_staff_as_admin_returns_200(self, admin_client):
        """TC-OPS-01: GET /api/v1/operations/staff as admin → 200 with list."""
        resp = admin_client.get("/api/v1/operations/staff")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_staff_as_staff_returns_200(self, staff_client):
        """TC-OPS-02: GET staff as support_staff → 200."""
        resp = staff_client.get("/api/v1/operations/staff")
        assert resp.status_code == 200

    def test_list_staff_as_resident_returns_403(self, resident_client):
        """TC-OPS-03: GET staff as flat_owner → 403."""
        resp = resident_client.get("/api/v1/operations/staff")
        assert resp.status_code == 403

    def test_list_staff_unauthenticated_returns_401(self, unauth_client):
        """TC-OPS-04: GET staff without auth → 401."""
        resp = unauth_client.get("/api/v1/operations/staff")
        assert resp.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# TC-OPS-TASKS: Tasks management
# ─────────────────────────────────────────────────────────────────────────────


class TestTasks:
    def test_create_task_as_admin_returns_201(self, admin_client):
        """TC-OPS-05: POST task as admin → 201."""
        resp = _create_task(admin_client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test Task"
        assert "id" in data

    def test_create_task_as_staff_returns_201(self, staff_client):
        """TC-OPS-06: POST task as support_staff → 201."""
        resp = _create_task(staff_client)
        assert resp.status_code == 201

    def test_create_task_as_resident_returns_403(self, resident_client):
        """TC-OPS-07: POST task as flat_owner → 403."""
        resp = _create_task(resident_client)
        assert resp.status_code == 403

    def test_create_task_blank_title_returns_422(self, admin_client):
        """TC-OPS-08: POST task with blank title → 422."""
        resp = _create_task(admin_client, title="   ")
        assert resp.status_code == 422

    def test_create_task_missing_required_fields_returns_422(self, admin_client):
        """TC-OPS-09: POST task with no fields → 422."""
        resp = admin_client.post("/api/v1/operations/tasks", json={})
        assert resp.status_code == 422

    def test_list_tasks_returns_list(self, admin_client):
        """TC-OPS-10: GET /api/v1/operations/tasks → 200 with list."""
        resp = admin_client.get("/api/v1/operations/tasks")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_tasks_filter_by_status(self, admin_client):
        """TC-OPS-11: GET tasks?status=pending → 200 filtered."""
        resp = admin_client.get("/api/v1/operations/tasks?status=pending")
        assert resp.status_code == 200

    def test_update_task_returns_200(self, admin_client):
        """TC-OPS-12: PATCH /api/v1/operations/tasks/{id} → 200."""
        task_id = _create_task(admin_client).json()["id"]
        resp = admin_client.patch(
            f"/api/v1/operations/tasks/{task_id}",
            json={"status": "in_progress"},
        )
        assert resp.status_code == 200

    def test_update_nonexistent_task_returns_404(self, admin_client):
        """TC-OPS-13: PATCH /api/v1/operations/tasks/99999 → 404."""
        resp = admin_client.patch(
            "/api/v1/operations/tasks/99999",
            json={"status": "done"},
        )
        assert resp.status_code == 404

    def test_list_tasks_unauthenticated_returns_401(self, unauth_client):
        """TC-OPS-14: GET tasks without auth → 401."""
        resp = unauth_client.get("/api/v1/operations/tasks")
        assert resp.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# TC-OPS-INV: Inventory management
# ─────────────────────────────────────────────────────────────────────────────


class TestInventory:
    def test_list_inventory_returns_list(self, admin_client):
        """TC-OPS-15: GET /api/v1/operations/inventory → 200 with list."""
        resp = admin_client.get("/api/v1/operations/inventory")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_inventory_item_as_admin_returns_201(self, admin_client):
        """TC-OPS-16: POST inventory item as admin → 201."""
        resp = _create_item(admin_client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Item"
        assert "id" in data

    def test_create_inventory_item_as_resident_returns_403(self, resident_client):
        """TC-OPS-17: POST inventory item as resident → 403."""
        resp = _create_item(resident_client)
        assert resp.status_code == 403

    def test_create_inventory_negative_quantity_returns_422(self, admin_client):
        """TC-OPS-18: POST item with negative initial_quantity → 422."""
        resp = _create_item(admin_client, initial_quantity=-1)
        assert resp.status_code == 422

    def test_create_inventory_missing_name_returns_422(self, admin_client):
        """TC-OPS-19: POST item without name → 422."""
        resp = admin_client.post(
            "/api/v1/operations/inventory",
            json={"category": "Cleaning", "unit_symbol": "L"},
        )
        assert resp.status_code == 422

    def test_list_inventory_with_search(self, admin_client):
        """TC-OPS-20: GET inventory?search=bleach → 200."""
        resp = admin_client.get("/api/v1/operations/inventory?search=bleach")
        assert resp.status_code == 200

    def test_inventory_movement_returns_200(self, admin_client):
        """TC-OPS-21: POST /inventory/{id}/movements records a valid movement."""
        item_id = _create_item(admin_client).json()["id"]
        resp = admin_client.post(
            f"/api/v1/operations/inventory/{item_id}/movements",
            json={"movement_type": "consumed", "quantity": 2, "note": "Used for cleaning"},
        )
        assert resp.status_code == 200

    def test_inventory_movement_zero_quantity_returns_422(self, admin_client):
        """TC-OPS-22: POST movement with quantity=0 → 422."""
        item_id = _create_item(admin_client).json()["id"]
        resp = admin_client.post(
            f"/api/v1/operations/inventory/{item_id}/movements",
            json={"movement_type": "consumed", "quantity": 0, "note": ""},
        )
        assert resp.status_code == 422

    def test_inventory_export_returns_csv(self, admin_client):
        """TC-OPS-23: GET /api/v1/operations/inventory-export → CSV."""
        resp = admin_client.get("/api/v1/operations/inventory-export")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    def test_inventory_options_returns_list(self, admin_client):
        """TC-OPS-24: GET /api/v1/operations/inventory-options → 200."""
        resp = admin_client.get("/api/v1/operations/inventory-options")
        assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# TC-OPS-SHIFTS: Shift roster
# ─────────────────────────────────────────────────────────────────────────────


class TestShifts:
    def test_list_shifts_returns_list(self, admin_client):
        """TC-OPS-25: GET /api/v1/operations/shifts → 200 with list."""
        resp = admin_client.get("/api/v1/operations/shifts")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_shift_as_admin_returns_201(self, admin_client):
        """TC-OPS-26: POST shift as admin → 201."""
        resp = _create_shift(admin_client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["role_label"] == "Security"
        assert "id" in data

    def test_create_shift_as_staff_returns_403(self, staff_client):
        """TC-OPS-27: POST shift as support_staff → 403 (only ops can manage roster)."""
        resp = _create_shift(staff_client)
        assert resp.status_code == 403

    def test_create_shift_invalid_days_mask_returns_422(self, admin_client):
        """TC-OPS-28: POST shift with days_mask=128 (out of range) → 422."""
        resp = _create_shift(admin_client, days_mask=128)
        assert resp.status_code == 422

    def test_create_shift_as_resident_returns_403(self, resident_client):
        """TC-OPS-29: POST shift as resident → 403."""
        resp = _create_shift(resident_client)
        assert resp.status_code == 403

    def test_update_shift_status_returns_200(self, admin_client):
        """TC-OPS-30: PATCH /api/v1/operations/shifts/{id}/status → 200."""
        shift_id = _create_shift(admin_client).json()["id"]
        resp = admin_client.patch(
            f"/api/v1/operations/shifts/{shift_id}/status",
            json={"status": "inactive"},
        )
        assert resp.status_code == 200

    def test_update_shift_status_nonexistent_returns_404(self, admin_client):
        """TC-OPS-31: PATCH /api/v1/operations/shifts/99999/status → 404."""
        resp = admin_client.patch(
            "/api/v1/operations/shifts/99999/status",
            json={"status": "inactive"},
        )
        assert resp.status_code == 404

    def test_shifts_export_returns_csv(self, admin_client):
        """TC-OPS-32: GET /api/v1/operations/shifts/export → CSV."""
        resp = admin_client.get("/api/v1/operations/shifts/export")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]


# ─────────────────────────────────────────────────────────────────────────────
# TC-OPS-ATT: Attendance
# ─────────────────────────────────────────────────────────────────────────────


class TestAttendance:
    def test_get_attendance_today_as_staff_returns_200(self, staff_client):
        """TC-OPS-33: GET /api/v1/operations/attendance/today as staff → 200."""
        resp = staff_client.get("/api/v1/operations/attendance/today")
        assert resp.status_code == 200

    def test_get_attendance_today_as_admin_returns_200(self, admin_client):
        """TC-OPS-34: GET attendance/today as admin → 200."""
        resp = admin_client.get("/api/v1/operations/attendance/today")
        assert resp.status_code == 200

    def test_get_attendance_today_as_resident_returns_403(self, resident_client):
        """TC-OPS-35: GET attendance/today as resident → 403."""
        resp = resident_client.get("/api/v1/operations/attendance/today")
        assert resp.status_code == 403

    def test_toggle_attendance_as_staff_returns_200(self, staff_client):
        """TC-OPS-36: POST /api/v1/operations/attendance/toggle as staff → 200."""
        resp = staff_client.post("/api/v1/operations/attendance/toggle")
        assert resp.status_code == 200

    def test_toggle_attendance_as_admin_returns_403(self, admin_client):
        """TC-OPS-37: POST toggle attendance as admin → 403 (staff-only action)."""
        resp = admin_client.post("/api/v1/operations/attendance/toggle")
        assert resp.status_code == 403

    def test_attendance_unauthenticated_returns_401(self, unauth_client):
        """TC-OPS-38: GET attendance without auth → 401."""
        resp = unauth_client.get("/api/v1/operations/attendance/today")
        assert resp.status_code in (401, 403)
