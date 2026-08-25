"""
tests/integration/community/test_community_api.py
Integration tests for all community API endpoints.

Covers:
  - GET/POST /api/v1/community/notices
  - POST /api/v1/community/notices/{id}/read
  - GET /api/v1/community/events
  - PUT /api/v1/community/events/{id}/rsvp
  - GET /api/v1/community/volunteers + signup/withdraw
  - GET /api/v1/community/polls/active
  - POST /api/v1/community/polls/{id}/votes
  - GET /api/v1/community/discussions
  - GET /api/v1/community/directory

Run from backend/:
    uv run pytest tests/integration/community/ -v
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.community.models import Notice, VolunteerOpportunity, VolunteerSignup
from app.db.database import get_db
from app.main import app



# ─────────────────────────────────────────────────────────────────────────────
# TC-COM-NOTICES: Notices
# ─────────────────────────────────────────────────────────────────────────────


class TestNotices:
    def _notice_payload(self, target_type="all", **overrides):
        payload = {
            "title": "Test Notice",
            "body": "This is a test notice body.",
            "target_type": target_type,
        }
        payload.update(overrides)
        return payload

    def test_list_notices_as_resident_returns_200(self, resident_client):
        """TC-COM-01: GET /api/v1/community/notices as resident → 200 paginated."""
        resp = resident_client.get("/api/v1/community/notices")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_list_notices_as_committee_returns_200(self, committee_client):
        """TC-COM-02: GET notices as committee member → 200."""
        resp = committee_client.get("/api/v1/community/notices")
        assert resp.status_code == 200

    def test_list_notices_unauthenticated_returns_401(self, unauth_client):
        """TC-COM-03: GET notices without auth → 401."""
        resp = unauth_client.get("/api/v1/community/notices")
        assert resp.status_code in (401, 403)

    def test_list_notices_as_staff_returns_403(self, staff_client):
        """TC-COM-04: GET notices as support_staff → 403 (not a community member)."""
        resp = staff_client.get("/api/v1/community/notices")
        assert resp.status_code == 403

    def test_list_notices_pagination(self, resident_client):
        """TC-COM-05: GET notices?page=1&page_size=5 respects pagination."""
        resp = resident_client.get("/api/v1/community/notices?page=1&page_size=5")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 5

    def test_create_notice_as_committee_returns_201(self, committee_client):
        """TC-COM-06: POST notice as committee member → 201."""
        resp = committee_client.post(
            "/api/v1/community/notices", json=self._notice_payload()
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test Notice"
        assert "id" in data

    def test_create_notice_as_admin_returns_201(self, admin_client):
        """TC-COM-07: POST notice as admin → 201."""
        resp = admin_client.post(
            "/api/v1/community/notices", json=self._notice_payload(title="Admin Notice")
        )
        assert resp.status_code == 201

    def test_create_notice_as_resident_returns_403(self, resident_client):
        """TC-COM-08: POST notice as resident → 403 (no broadcast rights)."""
        resp = resident_client.post(
            "/api/v1/community/notices", json=self._notice_payload()
        )
        assert resp.status_code == 403

    def test_create_notice_targeted_block_without_target_value_returns_422(
        self, committee_client
    ):
        """TC-COM-09: POST block notice without target_value → 422."""
        resp = committee_client.post(
            "/api/v1/community/notices",
            json=self._notice_payload(target_type="block"),  # no target_value
        )
        assert resp.status_code == 422

    def test_create_notice_targeted_flat_with_target_value_returns_201(
        self, committee_client
    ):
        """TC-COM-10: POST flat-targeted notice with target_value → 201."""
        resp = committee_client.post(
            "/api/v1/community/notices",
            json=self._notice_payload(
                target_type="flat", target_value="A-101", title="Flat Notice"
            ),
        )
        assert resp.status_code == 201

    def test_create_notice_missing_required_fields_returns_422(self, committee_client):
        """TC-COM-11: POST notice with no title or body → 422."""
        resp = committee_client.post(
            "/api/v1/community/notices", json={"target_type": "all"}
        )
        assert resp.status_code == 422

    def test_create_notice_rejects_whitespace_only_content(self, committee_client):
        resp = committee_client.post(
            "/api/v1/community/notices",
            json=self._notice_payload(title="   ", body="   "),
        )
        assert resp.status_code == 422

    def test_targeted_notice_rejects_audience_without_active_residents(
        self, committee_client
    ):
        before = committee_client.get("/api/v1/community/notices").json()["total"]
        resp = committee_client.post(
            "/api/v1/community/notices",
            json=self._notice_payload(
                target_type="flat", target_value="Z-999", title="Nobody"
            ),
        )
        assert resp.status_code == 422
        assert "no active residents" in resp.json()["detail"].lower()
        after = committee_client.get("/api/v1/community/notices").json()["total"]
        assert after == before

    def test_mark_notice_read_returns_200(self, resident_client):
        """TC-COM-12: POST /notices/{id}/read for existing notice → 200."""
        # Create a notice first (use committee client)
        from app.main import app
        from app.dependencies import get_current_user
        from fastapi.testclient import TestClient

        # Create notice via committee override
        def _committee():
            from tests.conftest import _make_committee_member
            return _make_committee_member()

        resident_override = app.dependency_overrides[get_current_user]
        app.dependency_overrides[get_current_user] = _committee
        setup_client = TestClient(app)
        notice_resp = setup_client.post(
            "/api/v1/community/notices",
            json={"title": "Read Test", "body": "Body", "target_type": "all"},
        )
        app.dependency_overrides[get_current_user] = resident_override

        if notice_resp.status_code == 201:
            nid = notice_resp.json()["id"]
            resp = resident_client.post(f"/api/v1/community/notices/{nid}/read")
            assert resp.status_code == 200

    def test_mark_nonexistent_notice_read_returns_404(self, resident_client):
        """TC-COM-13: POST /notices/99999/read → 404."""
        resp = resident_client.post("/api/v1/community/notices/99999/read")
        assert resp.status_code == 404

    def test_mark_read_authorizes_notice_beyond_first_hundred(self, resident_client):
        session = next(app.dependency_overrides[get_db]())
        session.add_all([
            Notice(
                title=f"Newer notice {index}",
                body="Body",
                target_type="all",
                published_at=datetime(2099, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=index),
                is_active=True,
            )
            for index in range(100)
        ])
        oldest = Notice(
            title="Authorized old notice",
            body="Body",
            target_type="all",
            published_at=datetime(1990, 1, 1, tzinfo=timezone.utc),
            is_active=True,
        )
        session.add(oldest)
        session.commit()

        response = resident_client.post(
            f"/api/v1/community/notices/{oldest.id}/read"
        )

        assert response.status_code == 200
        assert response.json()["id"] == oldest.id
        assert response.json()["is_read"] is True


# ─────────────────────────────────────────────────────────────────────────────
# TC-COM-EVENTS: Events
# ─────────────────────────────────────────────────────────────────────────────


class TestEvents:
    def test_list_events_as_resident_returns_200(self, resident_client):
        """TC-COM-14: GET /api/v1/community/events as resident → 200 with list."""
        resp = resident_client.get("/api/v1/community/events")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_events_unauthenticated_returns_401(self, unauth_client):
        """TC-COM-15: GET events without auth → 401."""
        resp = unauth_client.get("/api/v1/community/events")
        assert resp.status_code in (401, 403)

    def test_rsvp_event_nonexistent_returns_404(self, resident_client):
        """TC-COM-16: PUT /api/v1/community/events/99999/rsvp → 404."""
        resp = resident_client.put(
            "/api/v1/community/events/99999/rsvp",
            json={"status": "going"},
        )
        assert resp.status_code == 404

    def test_rsvp_event_missing_status_returns_422(self, resident_client):
        """TC-COM-17: PUT rsvp without status field → 422."""
        resp = resident_client.put(
            "/api/v1/community/events/1/rsvp", json={}
        )
        assert resp.status_code == 422

    def test_rsvp_event_as_staff_returns_403(self, staff_client):
        """TC-COM-18: PUT rsvp as support_staff → 403."""
        resp = staff_client.put(
            "/api/v1/community/events/1/rsvp",
            json={"status": "going"},
        )
        assert resp.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# TC-COM-VOLUNTEERS: Volunteer opportunities
# ─────────────────────────────────────────────────────────────────────────────


class TestVolunteers:
    def test_list_volunteers_returns_200(self, resident_client):
        """TC-COM-19: GET /api/v1/community/volunteers → 200 with list."""
        resp = resident_client.get("/api/v1/community/volunteers")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_volunteers_unauthenticated_returns_401(self, unauth_client):
        """TC-COM-20: GET volunteers without auth → 401."""
        resp = unauth_client.get("/api/v1/community/volunteers")
        assert resp.status_code in (401, 403)

    def test_signup_nonexistent_volunteer_returns_404(self, resident_client):
        """TC-COM-21: POST /volunteers/99999/signup → 404."""
        resp = resident_client.post("/api/v1/community/volunteers/99999/signup")
        assert resp.status_code == 404

    def test_withdraw_nonexistent_volunteer_returns_404(self, resident_client):
        """TC-COM-22: DELETE /volunteers/99999/signup → 404."""
        resp = resident_client.delete("/api/v1/community/volunteers/99999/signup")
        assert resp.status_code == 404

    def test_volunteer_as_staff_returns_403(self, staff_client):
        """TC-COM-23: POST volunteer signup as staff → 403."""
        resp = staff_client.post("/api/v1/community/volunteers/1/signup")
        assert resp.status_code == 403

    def test_expired_withdrawal_does_not_delete_signup(self, resident_client):
        session = next(app.dependency_overrides[get_db]())
        opportunity = VolunteerOpportunity(
            title="Closed opportunity",
            description="No longer accepting changes",
            volunteers_needed=2,
            closes_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            is_active=True,
        )
        session.add(opportunity)
        session.flush()
        signup = VolunteerSignup(
            opportunity_id=opportunity.id,
            user_id=9_000_001,
        )
        session.add(signup)
        session.commit()

        response = resident_client.delete(
            f"/api/v1/community/volunteers/{opportunity.id}/signup"
        )

        assert response.status_code == 404
        assert session.scalar(
            select(VolunteerSignup).where(VolunteerSignup.id == signup.id)
        ) is not None


# ─────────────────────────────────────────────────────────────────────────────
# TC-COM-POLLS: Polls
# ─────────────────────────────────────────────────────────────────────────────


class TestPolls:
    def test_get_active_poll_returns_200_or_null(self, resident_client):
        """TC-COM-24: GET /api/v1/community/polls/active → 200 (poll or null)."""
        resp = resident_client.get("/api/v1/community/polls/active")
        assert resp.status_code == 200
        # May return null if no active poll exists
        assert resp.json() is None or isinstance(resp.json(), dict)

    def test_get_active_poll_unauthenticated_returns_401(self, unauth_client):
        """TC-COM-25: GET active poll without auth → 401."""
        resp = unauth_client.get("/api/v1/community/polls/active")
        assert resp.status_code in (401, 403)

    def test_vote_inactive_or_missing_poll_returns_409(self, resident_client):
        """TC-COM-26: A missing poll is not accepting votes and returns 409."""
        resp = resident_client.post(
            "/api/v1/community/polls/99999/votes",
            json={"option_id": 1},
        )
        assert resp.status_code == 409

    def test_vote_invalid_option_id_returns_422(self, resident_client):
        """TC-COM-27: POST vote with option_id=0 → 422."""
        resp = resident_client.post(
            "/api/v1/community/polls/1/votes",
            json={"option_id": 0},
        )
        assert resp.status_code == 422

    def test_vote_as_staff_returns_403(self, staff_client):
        """TC-COM-28: POST poll vote as support_staff → 403."""
        resp = staff_client.post(
            "/api/v1/community/polls/1/votes",
            json={"option_id": 1},
        )
        assert resp.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# TC-COM-DISCUSS: Discussions
# ─────────────────────────────────────────────────────────────────────────────


class TestDiscussions:
    def test_list_discussions_returns_paginated_response(self, resident_client):
        """TC-COM-29: GET /api/v1/community/discussions → 200 paginated."""
        resp = resident_client.get("/api/v1/community/discussions")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_list_discussions_unauthenticated_returns_401(self, unauth_client):
        """TC-COM-30: GET discussions without auth → 401."""
        resp = unauth_client.get("/api/v1/community/discussions")
        assert resp.status_code in (401, 403)

    def test_list_discussions_pagination(self, resident_client):
        """TC-COM-31: GET discussions?page=1&page_size=5 → 200."""
        resp = resident_client.get(
            "/api/v1/community/discussions?page=1&page_size=5"
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 5

    def test_discussion_response_includes_bounded_aggregate_fields(
        self, resident_client
    ):
        resp = resident_client.get(
            "/api/v1/community/discussions?page=1&page_size=100"
        )
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert isinstance(item["reply_count"], int)
            assert isinstance(item["like_count"], int)
            assert item["author"]


# ─────────────────────────────────────────────────────────────────────────────
# TC-COM-DIR: Resident directory
# ─────────────────────────────────────────────────────────────────────────────


class TestDirectory:
    def test_directory_returns_paginated_response(self, admin_client):
        """TC-COM-32: GET /api/v1/community/directory → 200 paginated."""
        resp = admin_client.get("/api/v1/community/directory")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_directory_search_param(self, admin_client):
        """TC-COM-33: GET directory?search=Alice → 200 filtered results."""
        resp = admin_client.get("/api/v1/community/directory?search=Alice")
        assert resp.status_code == 200

    def test_directory_unauthenticated_returns_401(self, unauth_client):
        """TC-COM-34: GET directory without auth → 401."""
        resp = unauth_client.get("/api/v1/community/directory")
        assert resp.status_code in (401, 403)

    def test_directory_as_staff_returns_403(self, staff_client):
        """TC-COM-35: GET directory as support_staff → 403."""
        resp = staff_client.get("/api/v1/community/directory")
        assert resp.status_code == 403
