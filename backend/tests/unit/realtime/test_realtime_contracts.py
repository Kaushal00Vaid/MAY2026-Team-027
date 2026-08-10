"""
tests/unit/realtime/test_realtime_contracts.py
Unit tests for realtime module: ticket issuance, notification pagination schema.

Tests are pure Python — no HTTP, no real database.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

from app.realtime.models import WebSocketTicket
from app.realtime.schemas import NotificationPage
from app.realtime.service import TICKET_LIFETIME_SECONDS, issue_ticket


class FakeSession:
    def __init__(self):
        self.added = None
        self.committed = False

    def add(self, value):
        self.added = value

    def execute(self, _statement):
        return None

    def commit(self):
        self.committed = True


def test_ticket_is_short_lived_and_only_hash_is_persisted():
    """
    WebSocket ticket must:
    - be committed to the DB
    - store only the hash (not the raw token)
    - expire within the expected lifetime window
    """
    db = FakeSession()
    started_at = datetime.now(timezone.utc)
    raw, expires_at = issue_ticket(db, SimpleNamespace(user_id=42))
    assert db.committed
    assert isinstance(db.added, WebSocketTicket)
    assert db.added.token_hash != raw
    assert len(db.added.token_hash) == 64  # SHA-256 hex digest
    delta = (expires_at - started_at).total_seconds()
    assert TICKET_LIFETIME_SECONDS - 1 <= delta <= TICKET_LIFETIME_SECONDS + 1


def test_ticket_raw_token_is_non_empty():
    """The raw ticket returned to the caller must not be empty."""
    db = FakeSession()
    raw, _ = issue_ticket(db, SimpleNamespace(user_id=1))
    assert isinstance(raw, str)
    assert len(raw) > 0


def test_ticket_uniqueness():
    """Two separately issued tickets should produce different raw tokens."""
    db1, db2 = FakeSession(), FakeSession()
    raw1, _ = issue_ticket(db1, SimpleNamespace(user_id=1))
    raw2, _ = issue_ticket(db2, SimpleNamespace(user_id=1))
    assert raw1 != raw2


def test_notification_page_contract_includes_pagination_and_unread_count():
    """NotificationPage must serialize all required fields."""
    page = NotificationPage(items=[], total=0, unread_count=0, page=1, page_size=20)
    assert page.model_dump() == {
        "items": [],
        "total": 0,
        "unread_count": 0,
        "page": 1,
        "page_size": 20,
    }


def test_notification_page_with_items():
    """NotificationPage must serialize correctly when items are present."""
    from app.realtime.schemas import NotificationResponse
    from datetime import datetime, timezone
    item = NotificationResponse(
        id=1,
        event_type="complaint.created",
        title="New complaint",
        message="A complaint was filed",
        resource_type="complaint",
        resource_id="1",
        payload={},
        is_read=False,
        read_at=None,
        created_at=datetime.now(timezone.utc),
    )
    page = NotificationPage(
        items=[item],
        total=1,
        unread_count=1,
        page=1,
        page_size=20,
    )
    assert page.total == 1
    assert page.unread_count == 1
    assert len(page.items) == 1
    assert page.items[0].id == 1
