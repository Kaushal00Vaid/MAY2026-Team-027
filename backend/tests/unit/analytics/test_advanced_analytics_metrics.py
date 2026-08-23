from datetime import date, datetime, time, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.analytics.service import _format_inr_compact, _heatmap_slots


def test_formats_real_financial_values_in_inr():
    assert _format_inr_compact(0) == "₹0"
    assert _format_inr_compact(125_000_00) == "₹1.2L"
    assert _format_inr_compact(12_500_000_000) == "₹12.5Cr"


def test_heatmap_uses_booking_time_and_weekday():
    amenity = SimpleNamespace(operating_start=time(6), operating_end=time(20))
    bookings = [
        SimpleNamespace(starts_at=datetime(2026, 8, 10, 1, 0, tzinfo=timezone.utc)),
        SimpleNamespace(starts_at=datetime(2026, 8, 10, 1, 15, tzinfo=timezone.utc)),
        SimpleNamespace(starts_at=datetime(2026, 8, 11, 6, 30, tzinfo=timezone.utc)),
    ]

    heatmap = _heatmap_slots(amenity, bookings, date(2026, 8, 10))

    assert len(heatmap) == 7
    assert heatmap[0].day == "Mon"
    assert heatmap[0].slots[0].bookings == 2
    assert heatmap[0].slots[0].value == 4
    assert sum(slot.bookings for slot in heatmap[1].slots) == 1
    assert heatmap[6].date == "2026-08-16"


def test_heatmap_buckets_using_ist_across_utc_midnight():
    amenity = SimpleNamespace(operating_start=time(0), operating_end=time(7))
    bookings = [
        SimpleNamespace(
            starts_at=datetime(2026, 8, 9, 20, 0, tzinfo=timezone.utc)
        ),  # Monday 01:30 IST
    ]

    heatmap = _heatmap_slots(amenity, bookings, date(2026, 8, 10))

    assert sum(slot.bookings for slot in heatmap[0].slots) == 1
    assert sum(slot.bookings for day in heatmap[1:] for slot in day.slots) == 0
    assert datetime(2026, 8, 10, 1, 30, tzinfo=ZoneInfo("Asia/Kolkata")).date() == date(2026, 8, 10)
