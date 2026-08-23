from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class BulkInvoiceCreate(BaseModel):
    period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    purpose: str = Field("Monthly Maintenance", min_length=1, max_length=150)
    amount_paise: int = Field(..., gt=0, le=100_000_000)
    due_date: date

    @field_validator("purpose")
    @classmethod
    def strip_purpose(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Purpose cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_due_date(self):
        period_start = date.fromisoformat(f"{self.period}-01")
        if self.due_date < period_start:
            raise ValueError("Due date cannot be earlier than the billing period.")
        return self


class PaymentCreate(BaseModel):
    invoice_id: int = Field(..., gt=0)
    method: Literal["bank", "card"] = "bank"
    simulate_failure: bool = False


class ExpenseCreate(BaseModel):
    vendor: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=2000)
    amount_paise: int = Field(..., gt=0, le=100_000_000)
    expense_date: date

    @field_validator("vendor", "category", "description")
    @classmethod
    def strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    purpose: str
    period: str
    base_amount_paise: int
    late_fee_paise: int
    total_amount_paise: int
    amount_display: str
    status: str
    due_date: date
    issued_at: datetime
    paid_at: datetime | None
    unit: str | None
    resident_name: str
    version: int


class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount_paise: int
    amount_display: str
    method: str
    status: str
    gateway_transaction_id: str
    receipt_number: str | None
    failure_reason: str | None
    created_at: datetime
    settled_at: datetime | None


class LedgerResponse(BaseModel):
    id: int
    date: datetime
    description: str
    category: str
    direction: str
    amount_paise: int
    amount_display: str
    unit: str | None
    reference: str
    payment_id: int | None


class PaginatedLedger(BaseModel):
    items: list[LedgerResponse]
    total: int
    page: int
    page_size: int


class ResidentFinanceSummary(BaseModel):
    outstanding_paise: int
    outstanding_display: str
    late_fee_paise: int
    late_fee_display: str
    next_due_date: date | None
    invoices: list[InvoiceResponse]
    payments: list[PaymentResponse]
    ledger: list[LedgerResponse]
    allocations: list[dict]


class AdminFinanceSummary(BaseModel):
    total_reserve_paise: int
    total_reserve_display: str
    outstanding_paise: int
    outstanding_display: str
    collected_this_month_paise: int
    collected_this_month_display: str
    defaulter_count: int
    allocations: list[dict]


class BulkInvoiceResponse(BaseModel):
    run_id: int
    created_count: int
    eligible_flat_count: int = 0
    duplicate_flat_count: int = 0
    skipped_resident_count: int = 0
    period: str
    amount_paise: int
    amount_display: str
    message: str = ""
