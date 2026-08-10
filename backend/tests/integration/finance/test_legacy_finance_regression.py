"""
tests/test_finance.py — Tests for GET/POST /api/finance/transactions.

Uses the same dependency-override pattern as test_helpdesk.py.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.role import Role, RoleName, UserRole

client = TestClient(app)


# ── Auth override (simulates an admin user) ──────────────────────────────────

def _mock_admin():
    user = User(
        user_id=1,
        first_name="Admin",
        last_name="User",
        phone_number="9999999999",
        email="admin@test.com",
    )
    role = Role(role_id=2, role_name=RoleName.admin)
    assignment = UserRole(user_id=1, role_id=2)
    assignment.role = role
    user.roles = [assignment]
    return user


@pytest.fixture(autouse=True)
def _isolated_admin_override():
    app.dependency_overrides[get_current_user] = _mock_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _create_tx(type_: str = "income", amount: float = 240.00) -> dict:
    resp = client.post(
        "/api/finance/transactions",
        json={
            "unit_or_vendor": "A-102",
            "category": "Maintenance",
            "amount": amount,
            "type": type_,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_create_income_transaction():
    """POST creates an income transaction and returns 201 with correct shape."""
    data = _create_tx("income", 240.00)
    assert data["unit_or_vendor"] == "A-102"
    assert data["category"] == "Maintenance"
    assert float(data["amount"]) == 240.00
    assert data["type"] == "income"
    assert "id" in data
    assert "transaction_date" in data


def test_create_expense_transaction():
    """POST creates an expense transaction."""
    data = _create_tx("expense", 120.00)
    assert data["type"] == "expense"
    assert float(data["amount"]) == 120.00


def test_list_transactions_returns_list():
    """GET returns a JSON array."""
    _create_tx()  # ensure at least one row
    resp = client.get("/api/finance/transactions")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "type" in data[0]


def test_list_transactions_filter_income():
    """GET ?type=income returns only income rows."""
    _create_tx("income")
    _create_tx("expense")
    resp = client.get("/api/finance/transactions?type=income")
    assert resp.status_code == 200
    for tx in resp.json():
        assert tx["type"] == "income"


def test_list_transactions_filter_expense():
    """GET ?type=expense returns only expense rows."""
    _create_tx("income")
    _create_tx("expense")
    resp = client.get("/api/finance/transactions?type=expense")
    assert resp.status_code == 200
    for tx in resp.json():
        assert tx["type"] == "expense"


def test_create_transaction_invalid_amount_zero():
    """POST with amount = 0 must return 422 Unprocessable Entity."""
    resp = client.post(
        "/api/finance/transactions",
        json={
            "unit_or_vendor": "Vendor-01",
            "category": "Test",
            "amount": 0,
            "type": "income",
        },
    )
    assert resp.status_code == 422


def test_create_transaction_invalid_amount_negative():
    """POST with a negative amount must return 422."""
    resp = client.post(
        "/api/finance/transactions",
        json={
            "unit_or_vendor": "Vendor-01",
            "category": "Test",
            "amount": -50,
            "type": "income",
        },
    )
    assert resp.status_code == 422


def test_create_transaction_invalid_type():
    """POST with an unrecognised type must return 422."""
    resp = client.post(
        "/api/finance/transactions",
        json={
            "unit_or_vendor": "A-101",
            "category": "Maintenance",
            "amount": 100,
            "type": "refund",  # invalid
        },
    )
    assert resp.status_code == 422
