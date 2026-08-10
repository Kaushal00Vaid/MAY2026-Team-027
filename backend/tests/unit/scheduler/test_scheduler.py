from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

import scheduler


class FakeSession:
    def __init__(self, lock=True):
        self.lock = lock
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def scalar(self, *_args, **_kwargs):
        return self.lock

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        self.closed = True


def test_locked_job_retries_with_fresh_sessions_and_commits_once():
    sessions = []
    calls = 0
    sleeps = []

    def factory():
        session = FakeSession()
        sessions.append(session)
        return session

    def operation(_db, _now):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("temporary database failure")
        return {"updated": 2}

    result = scheduler._execute_locked(
        "test_job",
        operation,
        session_factory=factory,
        attempts=2,
        retry_delay=0.25,
        sleeper=sleeps.append,
    )

    assert result == {"updated": 2}
    assert sleeps == [0.25]
    assert sessions[0].rollbacks == 1
    assert sessions[1].commits == 1
    assert all(session.closed for session in sessions)


def test_locked_job_skips_when_another_worker_holds_lock():
    session = FakeSession(lock=False)
    operation_called = False

    def operation(_db, _now):
        nonlocal operation_called
        operation_called = True
        return {}

    result = scheduler._execute_locked(
        "test_job",
        operation,
        session_factory=lambda: session,
        attempts=1,
    )

    assert result == {"skipped": 1}
    assert operation_called is False
    assert session.rollbacks == 1
    assert session.closed is True


def test_locked_job_raises_after_final_attempt():
    session = FakeSession()

    with pytest.raises(RuntimeError, match="permanent"):
        scheduler._execute_locked(
            "test_job",
            lambda _db, _now: (_ for _ in ()).throw(RuntimeError("permanent")),
            session_factory=lambda: session,
            attempts=1,
        )

    assert session.rollbacks == 1
    assert session.closed is True


def test_notice_fanout_is_targeted_active_and_idempotent():
    captured = {}

    class Result:
        rowcount = 4

    class Session:
        def execute(self, statement, params):
            captured["sql"] = str(statement)
            captured["params"] = params
            return Result()

    now = datetime(2026, 8, 11, tzinfo=timezone.utc)
    result = scheduler._fanout_notices(Session(), now)

    sql = captured["sql"]
    assert result == {"deliveries_created": 4}
    assert "ON CONFLICT (notice_id, user_id) DO NOTHING" in sql
    assert "notice.expires_at" in sql
    assert "recipient.building_block" in sql
    assert "recipient.flat_number" in sql
    assert "flat_owner" in sql and "resident_rental" in sql
    assert captured["params"] == {"delivered_at": now}


def test_invoice_reminders_are_recorded_and_notified_once(monkeypatch):
    invoice = SimpleNamespace(
        id=12,
        resident_id=44,
        invoice_number="INV-12",
        base_amount_paise=120_000,
        late_fee_paise=0,
        due_date=datetime(2026, 8, 14).date(),
    )
    added = []
    notifications = []

    class Query:
        def __init__(self, rows):
            self.rows = rows

        def filter(self, *_args):
            return self

        def all(self):
            return self.rows

    class Session:
        def query(self, *entities):
            if len(entities) == 1 and entities[0] is scheduler.Invoice:
                return Query([invoice])
            return Query([])

        def add(self, item):
            added.append(item)

    monkeypatch.setattr(
        scheduler,
        "add_notifications",
        lambda _db, user_ids, **kwargs: notifications.append((user_ids, kwargs)),
    )

    result = scheduler._send_invoice_reminders(
        Session(), datetime(2026, 8, 11, 4, 0, tzinfo=timezone.utc)
    )

    assert result == {"reminders_created": 1}
    assert added[0].execution_key == "due_soon:2026-08-11"
    assert added[0].reminder_type == "due_soon"
    assert notifications[0][0] == [44]
    assert notifications[0][1]["event_type"] == "finance.invoice_reminder"


def test_scheduler_has_safe_job_defaults_and_all_production_jobs():
    instance = scheduler.build_scheduler()
    jobs = {job.id: job for job in instance.get_jobs()}

    assert set(jobs) == {
        "fanout_notices",
        "update_overdue_invoices",
        "send_invoice_reminders",
        "expire_visitors_and_passes",
        "complete_amenity_bookings",
    }
    assert instance._job_defaults["coalesce"] is True
    assert instance._job_defaults["max_instances"] == 1
    assert (
        instance._job_defaults["misfire_grace_time"]
        == scheduler.settings.SCHEDULER_MISFIRE_GRACE_SECONDS
    )
