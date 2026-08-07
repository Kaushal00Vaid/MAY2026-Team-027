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


@pytest.mark.parametrize(
    ("days_overdue", "expected"),
    [(0, 0), (1, 200), (7, 200), (8, 500), (30, 500), (31, 1000)],
)
def test_staggered_late_fee_tiers(days_overdue, expected):
    today = date(2026, 8, 7)
    assert late_fee(10_000, today - timedelta(days=days_overdue), today) == expected


def test_money_is_formatted_from_integer_paise():
    assert money(123_456) == "₹1,234.56"


@pytest.mark.parametrize("role", ["super_admin", "admin", "committee_member"])
def test_operational_roles_can_manage_finance(role):
    ensure_ops(user_with_role(role))


@pytest.mark.parametrize("role", ["flat_owner", "resident_rental"])
def test_resident_roles_can_access_personal_finance(role):
    ensure_resident(user_with_role(role))


def test_resident_cannot_manage_finance():
    with pytest.raises(HTTPException) as exc_info:
        ensure_ops(user_with_role("flat_owner"))
    assert exc_info.value.status_code == 403


def test_support_staff_cannot_access_resident_finance():
    with pytest.raises(HTTPException) as exc_info:
        ensure_resident(user_with_role("support_staff"))
    assert exc_info.value.status_code == 403


def test_bulk_invoice_contract_rejects_invalid_period_and_amount():
    with pytest.raises(ValidationError):
        BulkInvoiceCreate(
            period="2026-13",
            purpose="Maintenance",
            amount_paise=0,
            due_date=date(2026, 8, 15),
        )


def test_payment_method_is_bounded():
    with pytest.raises(ValidationError):
        PaymentCreate(invoice_id=1, method="cash")


def test_generated_report_is_a_pdf():
    report = simple_pdf("Finance Report", ["Outstanding: INR 1,200.00"])
    assert report.startswith(b"%PDF-1.4")
    assert report.endswith(b"%%EOF")
