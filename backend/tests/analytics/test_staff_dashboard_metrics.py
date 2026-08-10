from datetime import datetime, timezone

from app.analytics.service import IST, _local_day_window


def test_staff_dashboard_uses_india_calendar_day():
    now = datetime(2026, 8, 10, 20, 0, tzinfo=timezone.utc)

    start, end, local_date = _local_day_window(now)

    assert local_date.isoformat() == "2026-08-11"
    assert start == datetime(2026, 8, 10, 18, 30, tzinfo=timezone.utc)
    assert end == datetime(2026, 8, 11, 18, 30, tzinfo=timezone.utc)
    assert now.astimezone(IST).weekday() == 1
