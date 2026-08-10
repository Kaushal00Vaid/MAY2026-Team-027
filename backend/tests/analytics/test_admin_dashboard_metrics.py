from datetime import date, datetime, time, timezone
from types import SimpleNamespace

from app.analytics.service import _daily_slots, _shift_month


def test_shift_month_uses_calendar_boundaries_across_years():
    january = datetime(2026, 1, 1, tzinfo=timezone.utc)

    assert _shift_month(january, -1) == datetime(2025, 12, 1, tzinfo=timezone.utc)
    assert _shift_month(january, 12) == datetime(2027, 1, 1, tzinfo=timezone.utc)


def test_daily_slots_uses_operating_hours_and_slot_duration():
    amenity = SimpleNamespace(
        operating_start=time(6, 0),
        operating_end=time(22, 0),
        slot_minutes=60,
    )

    assert _daily_slots(amenity, date(2026, 8, 10)) == 16
