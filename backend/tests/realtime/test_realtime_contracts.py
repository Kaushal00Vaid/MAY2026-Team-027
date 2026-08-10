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
    db = FakeSession()
    started_at = datetime.now(timezone.utc)
    raw, expires_at = issue_ticket(db, SimpleNamespace(user_id=42))
    assert db.committed
    assert isinstance(db.added, WebSocketTicket)
    assert db.added.token_hash != raw
    assert len(db.added.token_hash) == 64
    assert TICKET_LIFETIME_SECONDS - 1 <= (expires_at - started_at).total_seconds() <= TICKET_LIFETIME_SECONDS + 0.1


def test_notification_page_contract_includes_pagination_and_unread_count():
    page = NotificationPage(items=[], total=0, unread_count=0, page=1, page_size=20)
    assert page.model_dump() == {"items": [], "total": 0, "unread_count": 0, "page": 1, "page_size": 20}
