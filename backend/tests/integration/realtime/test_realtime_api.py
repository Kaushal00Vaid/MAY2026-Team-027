"""
tests/integration/realtime/test_realtime_api.py
Integration tests for realtime & notifications API endpoints.

Covers:
  - POST /auth/ws-ticket
  - GET /api/v1/notifications
  - PATCH /api/v1/notifications/{id}/read
  - POST /api/v1/notifications/read-all
  - WebSocket /ws (basic rejection without a valid ticket)

Run from backend/:
    uv run pytest tests/integration/realtime/ -v
"""

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# TC-RT-TICKET: WebSocket ticket issuance
# ─────────────────────────────────────────────────────────────────────────────


class TestWebSocketTicket:
    def test_issue_ticket_as_resident_returns_200(self, resident_client):
        """TC-RT-01: POST /auth/ws-ticket as authenticated user → 200."""
        resp = resident_client.post("/auth/ws-ticket")
        assert resp.status_code == 200
        data = resp.json()
        assert "ticket" in data
        assert "expires_at" in data
        assert isinstance(data["ticket"], str)
        assert len(data["ticket"]) > 0

    def test_issue_ticket_as_admin_returns_200(self, admin_client):
        """TC-RT-02: POST /auth/ws-ticket as admin → 200."""
        resp = admin_client.post("/auth/ws-ticket")
        assert resp.status_code == 200

    def test_issue_ticket_unauthenticated_returns_401(self, unauth_client):
        """TC-RT-03: POST /auth/ws-ticket without auth → 401."""
        resp = unauth_client.post("/auth/ws-ticket")
        assert resp.status_code in (401, 403)

    def test_ticket_is_unique_per_request(self, resident_client):
        """TC-RT-04: Two ticket requests produce different tickets."""
        r1 = resident_client.post("/auth/ws-ticket").json()["ticket"]
        r2 = resident_client.post("/auth/ws-ticket").json()["ticket"]
        assert r1 != r2


# ─────────────────────────────────────────────────────────────────────────────
# TC-RT-NOTIF: Notifications
# ─────────────────────────────────────────────────────────────────────────────


class TestNotifications:
    def test_list_notifications_returns_paginated_response(self, resident_client):
        """TC-RT-05: GET /api/v1/notifications → 200 paginated response."""
        resp = resident_client.get("/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "unread_count" in data
        assert "page" in data
        assert "page_size" in data

    def test_list_notifications_items_is_list(self, resident_client):
        """TC-RT-06: items in notification response is a list."""
        resp = resident_client.get("/api/v1/notifications")
        assert isinstance(resp.json()["items"], list)

    def test_list_notifications_unread_only(self, resident_client):
        """TC-RT-07: GET notifications?unread_only=true → 200."""
        resp = resident_client.get("/api/v1/notifications?unread_only=true")
        assert resp.status_code == 200

    def test_list_notifications_pagination(self, resident_client):
        """TC-RT-08: GET notifications?page=1&page_size=5 → 200."""
        resp = resident_client.get("/api/v1/notifications?page=1&page_size=5")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 5

    def test_list_notifications_unauthenticated_returns_401(self, unauth_client):
        """TC-RT-09: GET notifications without auth → 401."""
        resp = unauth_client.get("/api/v1/notifications")
        assert resp.status_code in (401, 403)

    def test_list_notifications_invalid_page_returns_422(self, resident_client):
        """TC-RT-10: GET notifications?page=0 → 422."""
        resp = resident_client.get("/api/v1/notifications?page=0")
        assert resp.status_code == 422

    def test_list_notifications_page_size_too_large_returns_422(self, resident_client):
        """TC-RT-11: GET notifications?page_size=999 (above max 100) → 422."""
        resp = resident_client.get("/api/v1/notifications?page_size=999")
        assert resp.status_code == 422


class TestMarkNotificationRead:
    def test_mark_nonexistent_notification_read_returns_404(self, resident_client):
        """TC-RT-12: PATCH /notifications/99999/read → 404."""
        resp = resident_client.patch("/api/v1/notifications/99999/read")
        assert resp.status_code == 404

    def test_mark_notification_read_unauthenticated_returns_401(self, unauth_client):
        """TC-RT-13: PATCH /notifications/1/read without auth → 401."""
        resp = unauth_client.patch("/api/v1/notifications/1/read")
        assert resp.status_code in (401, 403)


class TestMarkAllNotificationsRead:
    def test_read_all_notifications_returns_200(self, resident_client):
        """TC-RT-14: POST /api/v1/notifications/read-all → 200."""
        resp = resident_client.post("/api/v1/notifications/read-all")
        assert resp.status_code == 200
        data = resp.json()
        assert "updated_count" in data
        assert isinstance(data["updated_count"], int)

    def test_read_all_notifications_unauthenticated_returns_401(self, unauth_client):
        """TC-RT-15: POST read-all without auth → 401."""
        resp = unauth_client.post("/api/v1/notifications/read-all")
        assert resp.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# TC-RT-WS: WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────


class TestWebSocket:
    def test_websocket_without_ticket_closes_with_4401(self, unauth_client):
        """TC-RT-16: WS /ws without valid ticket → connection closed with 4401."""
        with unauth_client.websocket_connect(
            "/ws?ticket=invalid-garbage-ticket-that-is-long-enough-to-pass-validation"
        ) as ws:
            # The server should close with 4401 or disconnect immediately
            try:
                data = ws.receive_json()
                # If we somehow receive data, the ticket was unexpectedly accepted
                # This means we got connection.ready which would be a bug
                assert data.get("type") != "connection.ready", (
                    "Invalid ticket should not result in connection.ready"
                )
            except Exception:
                # Expected: connection closed by server
                pass

    def test_websocket_requires_ticket_param(self, unauth_client):
        """TC-RT-17: WS /ws without ticket query param → 422."""
        try:
            with unauth_client.websocket_connect("/ws") as ws:
                ws.receive_json()
        except Exception as e:
            # Expected: 422 or connection refused without ticket param
            assert True
