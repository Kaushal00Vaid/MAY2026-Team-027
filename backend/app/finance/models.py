from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db.database import Base


class Invoice(Base):
    __tablename__ = "finance_invoices"
    __table_args__ = (
        UniqueConstraint(
            "resident_id",
            "purpose",
            "period",
            name="uq_invoice_resident_purpose_period",
        ),
        CheckConstraint(
            "status IN ('issued','overdue','paid','cancelled')",
            name="ck_invoice_status",
        ),
        CheckConstraint(
            "base_amount_paise > 0 AND late_fee_paise >= 0", name="ck_invoice_amounts"
        ),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    invoice_number = Column(String(40), unique=True, nullable=False)
    resident_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    purpose = Column(String(150), nullable=False)
    period = Column(String(7), nullable=False)
    base_amount_paise = Column(BigInteger, nullable=False)
    late_fee_paise = Column(BigInteger, nullable=False, server_default="0")
    status = Column(String(20), nullable=False, server_default="issued", index=True)
    due_date = Column(Date, nullable=False)
    issued_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    paid_at = Column(DateTime(timezone=True))
    version = Column(Integer, nullable=False, server_default="1")


class Payment(Base):
    __tablename__ = "finance_payments"
    __table_args__ = (
        CheckConstraint("status IN ('succeeded','failed')", name="ck_payment_status"),
        CheckConstraint("amount_paise > 0", name="ck_payment_amount"),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id = Column(
        BigInteger,
        ForeignKey("finance_invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    resident_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount_paise = Column(BigInteger, nullable=False)
    method = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False)
    idempotency_key = Column(String(100), unique=True, nullable=False)
    gateway_transaction_id = Column(String(100), unique=True, nullable=False)
    receipt_number = Column(String(50), unique=True)
    failure_reason = Column(String(255))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    settled_at = Column(DateTime(timezone=True))


class LedgerEntry(Base):
    __tablename__ = "finance_ledger_entries"
    __table_args__ = (
        CheckConstraint("direction IN ('debit','credit')", name="ck_ledger_direction"),
        CheckConstraint("amount_paise > 0", name="ck_ledger_amount"),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resident_id = Column(
        BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), index=True
    )
    invoice_id = Column(
        BigInteger, ForeignKey("finance_invoices.id", ondelete="RESTRICT"), index=True
    )
    payment_id = Column(
        BigInteger, ForeignKey("finance_payments.id", ondelete="RESTRICT"), index=True
    )
    expense_id = Column(
        BigInteger, ForeignKey("finance_expenses.id", ondelete="RESTRICT"), index=True
    )
    direction = Column(String(10), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class Expense(Base):
    __tablename__ = "finance_expenses"
    __table_args__ = (CheckConstraint("amount_paise > 0", name="ck_expense_amount"),)
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vendor = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    expense_date = Column(Date, nullable=False)
    recorded_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class FundAllocation(Base):
    __tablename__ = "finance_fund_allocations"
    __table_args__ = (
        CheckConstraint("basis_points BETWEEN 0 AND 10000", name="ck_allocation_bps"),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category = Column(String(100), unique=True, nullable=False)
    basis_points = Column(Integer, nullable=False)
    color = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, server_default="true")


class BulkInvoiceRun(Base):
    __tablename__ = "finance_bulk_invoice_runs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    idempotency_key = Column(String(100), unique=True, nullable=False)
    period = Column(String(7), nullable=False)
    purpose = Column(String(150), nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    invoice_count = Column(Integer, nullable=False, server_default="0")
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class InvoiceReminder(Base):
    __tablename__ = "finance_invoice_reminders"
    __table_args__ = (
        UniqueConstraint(
            "invoice_id", "execution_key", name="uq_invoice_reminder_execution"
        ),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id = Column(
        BigInteger,
        ForeignKey("finance_invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    execution_key = Column(String(100), nullable=False)
    reminder_type = Column(String(30), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
