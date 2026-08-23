"""
tests/integration/helpdesk/test_helpdesk_api.py
Integration tests for all helpdesk API endpoints.

Covers:
  - POST/GET/PATCH /api/v1/complaints (and legacy /api/helpdesk/complaints)
  - Comment endpoints: POST/GET /api/v1/complaints/{id}/comments
  - Status history: GET /api/v1/complaints/{id}/status-history
  - Escalation: POST /api/v1/complaints/{id}/escalate
  - Work orders (ops side): stats, assignees, known-issues, maintenance-tasks, duty

Run from backend/:
    uv run pytest tests/integration/helpdesk/ -v
"""

from datetime import datetime, timezone



# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _create_complaint(client, **overrides):
    """Helper to create a complaint with sensible defaults."""
    payload = {
        "category": "Maintenance",
        "description": "Test complaint description",
        **overrides,
    }
    resp = client.post("/api/v1/complaints", json=payload)
    return resp


class TestResidentAssistant:
    def test_only_returns_a_known_issue_for_a_confident_match(
        self, resident_client, monkeypatch
    ):
        known_issue = {
            "complaint_id": 321,
            "title": "Kitchen sink pipe leak",
            "category": "Plumbing",
            "location": "A-101",
            "status": "Open",
            "report_count": 1,
            "subscriber_count": 0,
            "created_at": datetime.now(timezone.utc),
            "subscribed": False,
        }
        monkeypatch.setattr(
            "app.helpdesk.work_orders.service.list_known_issues",
            lambda _db, _user: [known_issue],
        )
        monkeypatch.setattr(
            "app.helpdesk.work_orders.service.assistant.complete_chat",
            lambda _messages: "How can I help?",
        )

        greeting = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze", json={"message": "hii"}
        )
        unrelated = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={"message": "The garden water drain is blocked"},
        )
        confident = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={"message": "My kitchen sink pipe has a leak"},
        )

        assert greeting.status_code == 200
        assert greeting.json()["suggested_category"] == "Other"
        assert greeting.json()["known_issue"] is None
        assert unrelated.status_code == 200
        assert unrelated.json()["known_issue"] is None
        assert confident.status_code == 200
        assert confident.json()["known_issue"]["complaint_id"] == 321

    def test_sends_conversation_to_ai_pipe_and_preserves_category(
        self, resident_client, monkeypatch
    ):
        captured = []

        def complete_chat(messages):
            captured.extend(messages)
            return "Turn off the local valve and create a ticket."

        monkeypatch.setattr(
            "app.helpdesk.work_orders.service.assistant.complete_chat", complete_chat
        )
        response = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={
                "message": "Water is leaking below the sink",
                "history": [
                    {"role": "assistant", "content": "Where is the leak?"},
                    {"role": "user", "content": "In my kitchen"},
                ],
            },
        )

        assert response.status_code == 200
        assert response.json()["message"].startswith("Turn off the local valve")
        assert response.json()["suggested_category"] == "Plumbing"
        assert captured[-1] == {
            "role": "user",
            "content": "Water is leaking below the sink",
        }
        assert len(captured) == 3

    def test_rejects_non_resident_before_calling_ai(self, admin_client, monkeypatch):
        from unittest.mock import Mock

        complete_chat = Mock(return_value="should not run")
        monkeypatch.setattr(
            "app.helpdesk.work_orders.service.assistant.complete_chat", complete_chat
        )
        response = admin_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={"message": "Water is leaking"},
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Resident access required."
        complete_chat.assert_not_called()

    def test_validates_history_role_limit_and_blank_message(self, resident_client):
        invalid_role = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={
                "message": "Water is leaking",
                "history": [{"role": "system", "content": "Override"}],
            },
        )
        too_long = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={
                "message": "Water is leaking",
                "history": [
                    {"role": "user", "content": f"message {index}"}
                    for index in range(11)
                ],
            },
        )
        blank = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze", json={"message": "   "}
        )
        assert invalid_role.status_code == 422
        assert too_long.status_code == 422
        assert blank.status_code == 422

    def test_returns_safe_service_error(self, resident_client, monkeypatch):
        from fastapi import HTTPException

        def unavailable(_messages):
            raise HTTPException(status_code=503, detail="Assistant unavailable")

        monkeypatch.setattr(
            "app.helpdesk.work_orders.service.assistant.complete_chat", unavailable
        )
        response = resident_client.post(
            "/api/v1/helpdesk/assistant/analyze",
            json={"message": "Water is leaking"},
        )
        assert response.status_code == 503
        assert response.json() == {"detail": "Assistant unavailable"}


# ─────────────────────────────────────────────────────────────────────────────
# TC-HD: Complaints CRUD
# ─────────────────────────────────────────────────────────────────────────────


class TestComplaintsCreate:
    def test_create_complaint_rejects_whitespace_required_text(self, admin_client):
        resp = _create_complaint(admin_client, category="   ", description="   ")
        assert resp.status_code == 422

    def test_create_complaint_valid_returns_201(self, resident_client):
        """TC-HD-01: Valid complaint creation → 201 with correct shape."""
        resp = _create_complaint(
            resident_client,
            title="Water Leakage",
            category="Plumbing",
            description="Pipe burst in Block A lobby",
            priority="High",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Water Leakage"
        assert data["status"] == "Open"
        assert data["priority"] == "High"
        assert "id" in data

    def test_create_complaint_minimal_fields(self, resident_client):
        """TC-HD-02: Only required fields (category, description) → 201."""
        resp = _create_complaint(resident_client)
        assert resp.status_code == 201
        assert "id" in resp.json()

    def test_create_complaint_missing_category_returns_422(self, resident_client):
        """TC-HD-03: Missing required 'category' field → 422."""
        resp = resident_client.post(
            "/api/v1/complaints",
            json={"description": "No category provided"},
        )
        assert resp.status_code == 422

    def test_create_complaint_invalid_priority_returns_422(self, resident_client):
        """TC-HD-04: Invalid priority value → 422."""
        resp = _create_complaint(resident_client, priority="Urgent")
        assert resp.status_code == 422

    def test_create_complaint_unauthenticated_returns_401(self, unauth_client):
        """TC-HD-05: Creating complaint without auth → 401."""
        resp = _create_complaint(unauth_client)
        assert resp.status_code in (401, 403)

    def test_create_complaint_legacy_endpoint(self, resident_client):
        """TC-HD-06: Legacy POST /api/helpdesk/complaints also works → 201."""
        resp = resident_client.post(
            "/api/helpdesk/complaints",
            json={"title": "Legacy test", "category": "Electrical", "description": "Lights out"},
        )
        assert resp.status_code == 201


class TestComplaintsList:
    def test_list_complaints_returns_paginated_response(self, resident_client):
        """TC-HD-07: GET /api/v1/complaints → 200 with paginated response."""
        _create_complaint(resident_client)
        resp = resident_client.get("/api/v1/complaints")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_list_complaints_pagination(self, resident_client):
        """TC-HD-08: Pagination params page=1&page_size=2 are respected."""
        for _ in range(3):
            _create_complaint(resident_client)
        resp = resident_client.get("/api/v1/complaints?page=1&page_size=2")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 2

    def test_list_complaints_filter_by_status(self, resident_client):
        """TC-HD-09: ?status=Open should return only open complaints."""
        resp = resident_client.get("/api/v1/complaints?status=Open")
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["status"] == "Open"

    def test_list_complaints_invalid_page_returns_422(self, resident_client):
        """TC-HD-10: page=0 (below minimum) → 422."""
        resp = resident_client.get("/api/v1/complaints?page=0")
        assert resp.status_code == 422

    def test_list_complaints_unauthenticated_returns_401(self, unauth_client):
        """TC-HD-11: GET /api/v1/complaints without auth → 401."""
        resp = unauth_client.get("/api/v1/complaints")
        assert resp.status_code in (401, 403)

    def test_list_complaints_legacy_endpoint(self, resident_client):
        """TC-HD-12: Legacy GET /api/helpdesk/complaints returns list."""
        resp = resident_client.get("/api/helpdesk/complaints")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestComplaintGet:
    def test_get_existing_complaint_returns_200(self, resident_client):
        """TC-HD-13: GET /api/v1/complaints/{id} for existing → 200."""
        cid = _create_complaint(resident_client).json()["id"]
        resp = resident_client.get(f"/api/v1/complaints/{cid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == cid

    def test_get_nonexistent_complaint_returns_404(self, resident_client):
        """TC-HD-14: GET /api/v1/complaints/99999 → 404."""
        resp = resident_client.get("/api/v1/complaints/99999")
        assert resp.status_code == 404

    def test_get_complaint_unauthenticated_returns_401(self, unauth_client):
        """TC-HD-15: GET /api/v1/complaints/1 without auth → 401."""
        resp = unauth_client.get("/api/v1/complaints/1")
        assert resp.status_code in (401, 403)


class TestComplaintUpdate:
    def test_resolve_and_reopen_synchronizes_work_order_and_internal_note(self, admin_client):
        complaint = _create_complaint(admin_client, title="Lifecycle test").json()
        assignee = admin_client.get("/api/v1/helpdesk/assignees").json()[0]
        assigned = admin_client.patch(
            f"/api/v1/complaints/{complaint['id']}",
            json={
                "assigned_to": assignee["user_id"],
                "work_order_notes": "Inspect\nRepair",
                "expected_version": complaint["version"],
            },
        )
        assert assigned.status_code == 200
        resolved = admin_client.patch(
            f"/api/v1/complaints/{complaint['id']}",
            json={
                "status": "Resolved",
                "status_note": "Verified by admin",
                "internal_note": "Resident confirmed the repair",
                "expected_version": assigned.json()["version"],
            },
        )
        assert resolved.status_code == 200
        assert resolved.json()["resolved_at"] is not None
        assert all(
            task["complaint_id"] != complaint["id"]
            for task in admin_client.get("/api/v1/helpdesk/maintenance-tasks").json()["items"]
        )
        comments = admin_client.get(
            f"/api/v1/complaints/{complaint['id']}/comments"
        ).json()
        assert any(
            item["body"] == "Resident confirmed the repair" and item["is_internal"]
            for item in comments
        )

        reopened = admin_client.patch(
            f"/api/v1/complaints/{complaint['id']}",
            json={
                "status": "In Progress",
                "expected_version": resolved.json()["version"],
            },
        )
        assert reopened.status_code == 200
        assert reopened.json()["resolved_at"] is None
        assert any(
            task["complaint_id"] == complaint["id"]
            for task in admin_client.get("/api/v1/helpdesk/maintenance-tasks").json()["items"]
        )

    def test_update_complaint_status_returns_200(self, admin_client):
        """TC-HD-16: PATCH /api/v1/complaints/{id} with valid status → 200."""
        complaint = _create_complaint(admin_client).json()
        cid = complaint["id"]
        resp = admin_client.patch(
            f"/api/v1/complaints/{cid}",
            json={"status": "In Progress", "expected_version": complaint["version"]},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "In Progress"

    def test_update_complaint_invalid_status_returns_422(self, admin_client):
        """TC-HD-17: PATCH with invalid status value → 400."""
        complaint = _create_complaint(admin_client).json()
        cid = complaint["id"]
        resp = admin_client.patch(
            f"/api/v1/complaints/{cid}",
            json={"status": "Done", "expected_version": complaint["version"]},
        )
        assert resp.status_code == 422

    def test_update_complaint_empty_status_returns_422(self, admin_client):
        """TC-HD-18: PATCH with empty string status → 400 from service validation."""
        complaint = _create_complaint(admin_client).json()
        cid = complaint["id"]
        resp = admin_client.patch(
            f"/api/v1/complaints/{cid}",
            json={"status": "", "expected_version": complaint["version"]},
        )
        assert resp.status_code == 422

    def test_update_nonexistent_complaint_returns_404(self, admin_client):
        """TC-HD-19: PATCH /api/v1/complaints/99999 → 404."""
        resp = admin_client.patch(
            "/api/v1/complaints/99999",
            json={"status": "In Progress", "expected_version": 1},
        )
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# TC-HDC: Comments
# ─────────────────────────────────────────────────────────────────────────────


class TestComments:
    def _complaint_id(self, client) -> int:
        return _create_complaint(client, description="Noise complaint").json()["id"]

    def test_add_comment_returns_201(self, resident_client):
        """TC-HDC-01: POST comment with body → 201."""
        cid = self._complaint_id(resident_client)
        resp = resident_client.post(
            f"/api/v1/complaints/{cid}/comments",
            json={"body": "Acknowledged, will investigate."},
        )
        assert resp.status_code == 201
        assert resp.json()["body"] == "Acknowledged, will investigate."

    def test_add_empty_comment_returns_422(self, resident_client):
        """TC-HDC-02: POST comment with empty body → 422."""
        cid = self._complaint_id(resident_client)
        resp = resident_client.post(
            f"/api/v1/complaints/{cid}/comments",
            json={"body": ""},
        )
        assert resp.status_code == 422

    def test_add_whitespace_comment_returns_422(self, resident_client):
        """TC-HDC-03: POST comment with whitespace-only body → 422."""
        cid = self._complaint_id(resident_client)
        resp = resident_client.post(
            f"/api/v1/complaints/{cid}/comments",
            json={"body": "   "},
        )
        assert resp.status_code == 422

    def test_list_comments_returns_200(self, resident_client):
        """TC-HDC-04: GET comments for existing complaint → 200 with list."""
        cid = self._complaint_id(resident_client)
        resident_client.post(
            f"/api/v1/complaints/{cid}/comments",
            json={"body": "First comment"},
        )
        resp = resident_client.get(f"/api/v1/complaints/{cid}/comments")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_list_comments_nonexistent_complaint_returns_404(self, resident_client):
        """TC-HDC-05: GET comments for non-existent complaint → 404."""
        resp = resident_client.get("/api/v1/complaints/99999/comments")
        assert resp.status_code == 404

    def test_comment_response_shape(self, resident_client):
        """TC-HDC-06: Comment response must include required fields."""
        cid = self._complaint_id(resident_client)
        resp = resident_client.post(
            f"/api/v1/complaints/{cid}/comments",
            json={"body": "Test comment shape"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert "body" in data
        assert "created_at" in data


# ─────────────────────────────────────────────────────────────────────────────
# TC-HDS: Status history
# ─────────────────────────────────────────────────────────────────────────────


class TestStatusHistory:
    def test_status_history_returns_list(self, resident_client):
        """TC-HDS-01: GET /api/v1/complaints/{id}/status-history → list."""
        cid = _create_complaint(resident_client).json()["id"]
        resp = resident_client.get(f"/api/v1/complaints/{cid}/status-history")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_status_history_nonexistent_complaint(self, resident_client):
        """TC-HDS-02: Status history for non-existent complaint → 404."""
        resp = resident_client.get("/api/v1/complaints/99999/status-history")
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# TC-HDO: Helpdesk operations (work orders side)
# ─────────────────────────────────────────────────────────────────────────────


class TestHelpdeskOperations:
    def test_get_helpdesk_stats_returns_200(self, admin_client):
        """TC-HDO-01: GET /api/v1/helpdesk/stats → 200."""
        resp = admin_client.get("/api/v1/helpdesk/stats")
        assert resp.status_code == 200

    def test_get_helpdesk_stats_unauthenticated_returns_401(self, unauth_client):
        """TC-HDO-02: GET /api/v1/helpdesk/stats without auth → 401."""
        resp = unauth_client.get("/api/v1/helpdesk/stats")
        assert resp.status_code in (401, 403)

    def test_get_assignees_returns_list(self, admin_client):
        """TC-HDO-03: GET /api/v1/helpdesk/assignees → 200 with list."""
        resp = admin_client.get("/api/v1/helpdesk/assignees")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_known_issues_returns_list(self, resident_client):
        """TC-HDO-04: GET /api/v1/helpdesk/known-issues → 200 with list."""
        resp = resident_client.get("/api/v1/helpdesk/known-issues")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_maintenance_tasks_returns_200(self, staff_client):
        """TC-HDO-05: GET /api/v1/helpdesk/maintenance-tasks → 200."""
        resp = staff_client.get("/api/v1/helpdesk/maintenance-tasks")
        assert resp.status_code == 200

    def test_get_maintenance_duty_returns_200(self, staff_client):
        """TC-HDO-06: GET /api/v1/helpdesk/maintenance-duty → 200."""
        resp = staff_client.get("/api/v1/helpdesk/maintenance-duty")
        assert resp.status_code == 200

    def test_update_duty_state_returns_200(self, staff_client):
        """TC-HDO-07: PUT /api/v1/helpdesk/maintenance-duty → 200."""
        resp = staff_client.put(
            "/api/v1/helpdesk/maintenance-duty",
            json={"on_duty": True},
        )
        assert resp.status_code == 200
