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


def test_all_resident_notice_does_not_retain_target_value():
    notice = NoticeCreate(title="  AGM  ", body="  Meeting at 7 PM  ", target_type="all", target_value="A")
    assert notice.title == "AGM"
    assert notice.body == "Meeting at 7 PM"
    assert notice.target_value is None


@pytest.mark.parametrize("target_type", ["block", "flat"])
def test_targeted_notice_requires_target_value(target_type):
    with pytest.raises(ValidationError):
        NoticeCreate(title="Notice", body="Details", target_type=target_type)


def test_poll_option_id_must_be_positive():
    with pytest.raises(ValidationError):
        PollVoteCreate(option_id=0)


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental", "committee_member"])
def test_residents_and_committee_can_access_community(role):
    ensure_community_member(user_with_role(role))


def test_support_staff_cannot_access_resident_community():
    with pytest.raises(HTTPException) as exc_info:
        ensure_community_member(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


def test_resident_cannot_broadcast_notices():
    with pytest.raises(HTTPException) as exc_info:
        ensure_operational(user_with_role("flat_owner"))
    assert exc_info.value.status_code == 403


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_broadcast_notices(role):
    ensure_operational(user_with_role(role))
