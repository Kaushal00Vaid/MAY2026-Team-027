"""
tests/unit/auth/test_google_profile_completion.py
Unit tests for Google OAuth profile completion service logic.

Tests that manually-entered phone numbers remain unverified after
profile completion, and that the profile is marked as complete.
"""
from types import SimpleNamespace

from app.auth import service
from app.auth.schemas import CompleteProfileRequest


class FakeQuery:
    def filter(self, *args):
        return self

    def first(self):
        return None


class FakeDb:
    def query(self, model):
        return FakeQuery()

    def commit(self):
        pass

    def refresh(self, user):
        pass


def test_manually_entered_google_phone_remains_unverified(monkeypatch):
    """
    Phone number supplied during Google profile completion must NOT be
    auto-verified. Only OTP flow grants is_phone_verified=True.
    """
    monkeypatch.setattr(
        service, "_build_token_pair", lambda db, user, request: ("access", "refresh")
    )
    user = SimpleNamespace(
        user_id=1,
        phone_number=None,
        first_name="Google",
        last_name="User",
        is_profile_complete=False,
        is_phone_verified=False,
        flat_number=None,
        building_block=None,
        emergency_contact=None,
    )
    data = CompleteProfileRequest(
        phone_number="+919876543210", first_name="Google", last_name="User"
    )
    tokens = service.complete_google_profile(FakeDb(), user, data, SimpleNamespace())
    assert tokens == ("access", "refresh")
    assert user.is_profile_complete is True
    assert user.is_phone_verified is False


def test_profile_completion_updates_optional_fields(monkeypatch):
    """
    Optional fields (flat_number, building_block, emergency_contact) from
    CompleteProfileRequest should be applied to the user object when supplied.
    """
    monkeypatch.setattr(
        service, "_build_token_pair", lambda db, user, request: ("access", "refresh")
    )
    user = SimpleNamespace(
        user_id=2,
        phone_number=None,
        first_name="Google",
        last_name="User",
        is_profile_complete=False,
        is_phone_verified=False,
        flat_number=None,
        building_block=None,
        emergency_contact=None,
    )
    data = CompleteProfileRequest(
        phone_number="+919876543211",
        first_name="Updated",
        last_name="Name",
        flat_number="B-202",
        building_block="B",
    )
    service.complete_google_profile(FakeDb(), user, data, SimpleNamespace())
    assert user.flat_number == "B-202"
    assert user.building_block == "B"
    assert user.is_profile_complete is True
