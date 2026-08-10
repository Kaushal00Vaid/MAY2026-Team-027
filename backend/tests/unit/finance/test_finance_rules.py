"""
tests/unit/finance/test_finance_rules.py
Unit tests for finance module business logic: late fees, money formatting,
permissions, schema validation, and PDF report generation.

Tests are pure Python — no HTTP, no database.
"""
from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.finance.contracts import BulkInvoiceCreate, PaymentCreate
from app.finance.operations import (
    ensure_ops,
    ensure_resident,
    late_fee,
    money,
    simple_pdf,
)


def user_with_role(role: str):
    return SimpleNamespace(
        roles=[
            SimpleNamespace(role=SimpleNamespace(role_name=SimpleNamespace(value=role)))
        ]
    )


# ── Late fee tiers ─────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("days_overdue", "expected"),
    [(0, 0), (1, 200), (7, 200), (8, 500), (30, 500), (31, 1000)],
)
def test_staggered_late_fee_tiers(days_overdue, expected):
    """Late fees must follow a 3-tier schedule based on days overdue."""
    today = date(2026, 8, 7)
    assert late_fee(10_000, today - timedelta(days=days_overdue), today) == expected


def test_no_late_fee_for_future_due_date():
    """A due date in the future means 0 days overdue → no fee."""
    today = date(2026, 8, 7)
    assert late_fee(10_000, today + timedelta(days=1), today) == 0


# ── Money formatting ───────────────────────────────────────────────────────


def test_money_is_formatted_from_integer_paise():
    """money() must convert paise (1/100 ₹) to formatted rupee string."""
    assert money(123_456) == "₹1,234.56"


def test_money_zero():
    """Zero paise should format to ₹0.00."""
    assert money(0) == "₹0.00"


def test_money_round_number():
    """10000 paise = ₹100.00."""
    assert money(10_000) == "₹100.00"


# ── Permissions ────────────────────────────────────────────────────────────


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_manage_finance(role):
    """Admin, super_admin, and committee_member should pass ensure_ops."""
    ensure_ops(user_with_role(role))


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental"])
def test_resident_roles_can_access_personal_finance(role):
    """Resident roles should pass ensure_resident for personal finance access."""
    ensure_resident(user_with_role(role))


def test_resident_cannot_manage_finance():
    """flat_owner must be denied access through ensure_ops."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_ops(user_with_role("flat_owner"))
    assert exc_info.value.status_code == 403


def test_support_staff_cannot_access_resident_finance():
    """Support staff must not access resident personal finance."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_resident(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


def test_support_staff_cannot_manage_finance():
    """Support staff must not manage society finance."""
    with pytest.raises(HTTPException) as exc_info:
        ensure_ops(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


# ── Schema: BulkInvoiceCreate ──────────────────────────────────────────────


def test_bulk_invoice_contract_rejects_invalid_period():
    """Period must match YYYY-MM format (month 1-12)."""
    with pytest.raises(ValidationError):
        BulkInvoiceCreate(
            period="2026-13",
            purpose="Maintenance",
            amount_paise=1000,
            due_date=date(2026, 8, 15),
        )


def test_bulk_invoice_contract_rejects_zero_amount():
    """amount_paise must be positive."""
    with pytest.raises(ValidationError):
        BulkInvoiceCreate(
            period="2026-08",
            purpose="Maintenance",
            amount_paise=0,
            due_date=date(2026, 8, 15),
        )


def test_valid_bulk_invoice_create():
    """A fully valid BulkInvoiceCreate should not raise."""
    inv = BulkInvoiceCreate(
        period="2026-08",
        purpose="Maintenance",
        amount_paise=50_000,
        due_date=date(2026, 8, 31),
    )
    assert inv.period == "2026-08"
    assert inv.amount_paise == 50_000


# ── Schema: PaymentCreate ──────────────────────────────────────────────────


def test_payment_method_is_bounded():
    """'cash' is not a valid payment method."""
    with pytest.raises(ValidationError):
        PaymentCreate(invoice_id=1, method="cash")


def test_payment_valid_method():
    """A valid payment method ('bank' or 'card') should be accepted."""
    p = PaymentCreate(invoice_id=1, method="bank")
    assert p.method == "bank"


def test_payment_card_method_accepted():
    """'card' is also a valid payment method."""
    p = PaymentCreate(invoice_id=1, method="card")
    assert p.method == "card"


# ── PDF report generation ──────────────────────────────────────────────────


def test_generated_report_is_a_pdf():
    """simple_pdf() must produce a valid PDF binary."""
    report = simple_pdf("Finance Report", ["Outstanding: INR 1,200.00"])
    assert report.startswith(b"%PDF-1.4")
    assert report.endswith(b"%%EOF")


def test_pdf_report_with_multiple_lines():
    """simple_pdf() should handle multiple lines without error."""
    report = simple_pdf("Test Report", ["Line 1", "Line 2", "Line 3"])
    assert isinstance(report, bytes)
    assert len(report) > 0
