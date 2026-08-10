"""
tests/unit/helpdesk/test_complaints_validation.py
Unit tests for helpdesk complaint/comment schema validation, status transitions,
location fallback logic, and file attachment signature validation.

Tests are pure Python — no HTTP, no database.
"""
import pytest
from pydantic import ValidationError

from app.helpdesk.attachments.validation import matches_declared_type
from app.helpdesk.complaints.schemas import CommentCreate, ComplaintCreate
from app.helpdesk.complaints.service import STATUS_TRANSITIONS, complaint_location


# ── Schema: ComplaintCreate ────────────────────────────────────────────────


def test_complaint_text_is_trimmed():
    """title, category, and description must be stripped of surrounding whitespace."""
    complaint = ComplaintCreate(
        title="  Lift issue  ",
        category="  Maintenance  ",
        description="  Lift is stuck  ",
        priority="High",
    )
    assert complaint.title == "Lift issue"
    assert complaint.category == "Maintenance"
    assert complaint.description == "Lift is stuck"


@pytest.mark.parametrize(
    "payload",
    [
        {"category": "Maintenance", "description": "Issue", "latitude": 12.3},
        {"category": "Maintenance", "description": "Issue", "longitude": 77.1},
        {
            "category": "Maintenance",
            "description": "Issue",
            "latitude": 91,   # out of range
            "longitude": 77.1,
        },
    ],
)
def test_invalid_coordinates_are_rejected(payload):
    """Providing only one coordinate, or out-of-range values, must be rejected."""
    with pytest.raises(ValidationError):
        ComplaintCreate(**payload)


def test_valid_coordinates_are_accepted():
    """Providing both valid lat and long should be accepted."""
    c = ComplaintCreate(
        category="Maintenance",
        description="Issue",
        latitude=12.9716,
        longitude=77.5946,
    )
    assert c.latitude == 12.9716
    assert c.longitude == 77.5946


def test_unknown_priority_is_rejected():
    """Priority must be one of the allowed values."""
    with pytest.raises(ValidationError):
        ComplaintCreate(
            category="Maintenance",
            description="Issue",
            priority="Urgent",
        )


def test_valid_priorities_are_accepted():
    """Each allowed priority value should be accepted."""
    for priority in ("Low", "Normal", "High", "Critical"):
        c = ComplaintCreate(
            category="Maintenance",
            description="Issue",
            priority=priority,
        )
        assert c.priority == priority


# ── Schema: CommentCreate ──────────────────────────────────────────────────


def test_blank_comment_is_rejected():
    """A whitespace-only comment body must be rejected."""
    with pytest.raises(ValidationError):
        CommentCreate(body="   ")


def test_valid_comment_is_accepted():
    """A non-empty comment body should be accepted."""
    c = CommentCreate(body="This is a valid comment.")
    assert c.body == "This is a valid comment."


# ── Status transitions ─────────────────────────────────────────────────────


def test_closed_complaints_have_no_status_transition():
    """A Closed complaint must have no allowed transitions."""
    assert STATUS_TRANSITIONS["Closed"] == set()


def test_open_complaint_can_transition_to_in_progress_or_resolved():
    """An Open complaint should be able to move to In Progress or Resolved."""
    assert "Resolved" in STATUS_TRANSITIONS["Open"]
    assert "In Progress" in STATUS_TRANSITIONS["Open"]


def test_resolved_complaint_can_close():
    """A Resolved complaint should be able to transition to Closed."""
    assert "Closed" in STATUS_TRANSITIONS["Resolved"]


# ── Location fallback ─────────────────────────────────────────────────────


def test_registered_flat_is_used_when_location_is_omitted():
    """If no location is given, the user's registered flat number is used."""
    user = type("User", (), {"flat_number": "A-101", "building_block": "A"})()
    assert complaint_location(user, None) == "A-101"


def test_explicit_location_is_not_replaced_by_registered_flat():
    """An explicitly provided location must not be overridden."""
    user = type("User", (), {"flat_number": "A-101", "building_block": "A"})()
    assert complaint_location(user, "Clubhouse entrance") == "Clubhouse entrance"


# ── File attachment validation ────────────────────────────────────────────


@pytest.mark.parametrize(
    ("content", "mime_type"),
    [
        (b"\xff\xd8\xffimage", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\nimage", "image/png"),
        (b"RIFF1234WEBPimage", "image/webp"),
        (b"%PDF-1.7", "application/pdf"),
    ],
)
def test_upload_signature_matches_declared_mime(content, mime_type):
    """Magic-byte signature must match the declared MIME type."""
    assert matches_declared_type(content, mime_type)


def test_spoofed_upload_is_rejected():
    """A non-PNG file declared as image/png must be rejected."""
    assert not matches_declared_type(b"not really a png", "image/png")


def test_spoofed_jpeg_rejected():
    """A non-JPEG file declared as image/jpeg must be rejected."""
    assert not matches_declared_type(b"GIF89a...", "image/jpeg")
