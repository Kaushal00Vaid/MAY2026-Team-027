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
