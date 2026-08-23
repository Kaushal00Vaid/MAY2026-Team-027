"""
tests/unit/community/test_validation_and_permissions.py
Unit tests for community module schema validation and permission guards.

Tests are pure Python — no HTTP, no database.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.community.permissions import ensure_community_member, ensure_operational
from app.community.schemas import NoticeCreate, PollVoteCreate


def user_with_role(role: str):
    return SimpleNamespace(
        roles=[SimpleNamespace(role=SimpleNamespace(role_name=SimpleNamespace(value=role)))]
    )


# ── Schema: NoticeCreate ───────────────────────────────────────────────────


def test_all_resident_notice_does_not_retain_target_value():
    """target_value must be cleared when target_type='all'."""
    notice = NoticeCreate(
        title="  AGM  ", body="  Meeting at 7 PM  ", target_type="all", target_value="A"
    )
    assert notice.title == "AGM"
    assert notice.body == "Meeting at 7 PM"
    assert notice.target_value is None


@pytest.mark.parametrize("target_type", ["block", "flat"])
def test_targeted_notice_requires_target_value(target_type):
    """block/flat target types must supply a target_value."""
    with pytest.raises(ValidationError):
        NoticeCreate(title="Notice", body="Details", target_type=target_type)


def test_targeted_notice_with_target_value_is_accepted():
    """block/flat target with a target_value should be valid."""
    notice = NoticeCreate(
        title="Block Notice", body="Details", target_type="block", target_value="A"
    )
    assert notice.target_value == "A"


def test_notice_title_is_trimmed():
    """Leading/trailing whitespace in title should be stripped."""
    notice = NoticeCreate(title="  Hello  ", body="Content", target_type="all")
    assert notice.title == "Hello"


@pytest.mark.parametrize(
    ("title", "body"),
    [("   ", "Content"), ("Notice", "   ")],
)
def test_notice_rejects_whitespace_only_content(title, body):
    with pytest.raises(ValidationError):
        NoticeCreate(title=title, body=body, target_type="all")


# ── Schema: PollVoteCreate ─────────────────────────────────────────────────


def test_poll_option_id_must_be_positive():
    """option_id=0 is invalid — IDs are 1-indexed."""
    with pytest.raises(ValidationError):
        PollVoteCreate(option_id=0)


def test_poll_option_id_negative_rejected():
    """Negative option_id must also be rejected."""
    with pytest.raises(ValidationError):
        PollVoteCreate(option_id=-1)


def test_poll_option_id_positive_accepted():
    """A positive option_id must be accepted."""
    vote = PollVoteCreate(option_id=3)
    assert vote.option_id == 3


# ── Permission: ensure_community_member ───────────────────────────────────


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental", "committee_member"])
def test_residents_and_committee_can_access_community(role):
    """Resident and committee roles should pass the community member gate."""
    ensure_community_member(user_with_role(role))


def test_support_staff_cannot_access_resident_community():
    """Support staff should be denied access to the community module."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_community_member(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


# ── Permission: ensure_operational ────────────────────────────────────────


def test_resident_cannot_broadcast_notices():
    """Residents must not be able to create/broadcast notices."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_role("flat_owner"))
    assert exc_info.value.status_code == 403


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_broadcast_notices(role):
    """Admin and committee roles should be permitted to broadcast notices."""
    ensure_operational(user_with_role(role))
