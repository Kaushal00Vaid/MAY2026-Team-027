import pytest
from pydantic import ValidationError

from app.helpdesk.attachments.validation import matches_declared_type
from app.helpdesk.complaints.schemas import CommentCreate, ComplaintCreate
from app.helpdesk.complaints.service import STATUS_TRANSITIONS, complaint_location


def test_complaint_text_is_trimmed():
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
            "latitude": 91,
            "longitude": 77.1,
        },
    ],
)
def test_invalid_coordinates_are_rejected(payload):
    with pytest.raises(ValidationError):
        ComplaintCreate(**payload)


def test_unknown_priority_is_rejected():
    with pytest.raises(ValidationError):
        ComplaintCreate(
            category="Maintenance",
            description="Issue",
            priority="Urgent",
        )


def test_blank_comment_is_rejected():
    with pytest.raises(ValidationError):
        CommentCreate(body="   ")


def test_closed_complaints_have_no_status_transition():
    assert STATUS_TRANSITIONS["Closed"] == set()
    assert "Resolved" in STATUS_TRANSITIONS["Open"]
    assert "In Progress" in STATUS_TRANSITIONS["Open"]


def test_registered_flat_is_used_when_location_is_omitted():
    user = type("User", (), {"flat_number": "A-101", "building_block": "A"})()
    assert complaint_location(user, None) == "A-101"


def test_explicit_location_is_not_replaced_by_registered_flat():
    user = type("User", (), {"flat_number": "A-101", "building_block": "A"})()
    assert complaint_location(user, "Clubhouse entrance") == "Clubhouse entrance"


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
    assert matches_declared_type(content, mime_type)


def test_spoofed_upload_is_rejected():
    assert not matches_declared_type(b"not really a png", "image/png")
