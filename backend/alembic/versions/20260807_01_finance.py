"""Finance invoices, payments, immutable ledger, expenses and allocations.

Revision ID: 20260807_01
Revises: 20260806_02_security
"""

import sqlalchemy as sa
from alembic import op

revision = "20260807_01"
down_revision = "20260806_02_security"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "finance_invoices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("invoice_number", sa.String(40), nullable=False, unique=True),
        sa.Column("resident_id", sa.BigInteger(), nullable=False),
        sa.Column("purpose", sa.String(150), nullable=False),
        sa.Column("period", sa.String(7), nullable=False),
        sa.Column("base_amount_paise", sa.BigInteger(), nullable=False),
        sa.Column(
            "late_fee_paise", sa.BigInteger(), server_default="0", nullable=False
        ),
        sa.Column("status", sa.String(20), server_default="issued", nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column(
            "issued_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint(
            "status IN ('issued','overdue','paid','cancelled')",
            name="ck_invoice_status",
        ),
        sa.CheckConstraint(
            "base_amount_paise > 0 AND late_fee_paise >= 0", name="ck_invoice_amounts"
        ),
        sa.ForeignKeyConstraint(
            ["resident_id"], ["users.user_id"], ondelete="RESTRICT"
        ),
        sa.UniqueConstraint(
            "resident_id",
            "purpose",
            "period",
            name="uq_invoice_resident_purpose_period",
        ),
    )
    op.create_index(
        "ix_finance_invoices_resident_id", "finance_invoices", ["resident_id"]
    )
    op.create_index("ix_finance_invoices_status", "finance_invoices", ["status"])
    op.create_table(
        "finance_payments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("invoice_id", sa.BigInteger(), nullable=False),
        sa.Column("resident_id", sa.BigInteger(), nullable=False),
        sa.Column("amount_paise", sa.BigInteger(), nullable=False),
        sa.Column("method", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("idempotency_key", sa.String(100), nullable=False, unique=True),
        sa.Column(
            "gateway_transaction_id", sa.String(100), nullable=False, unique=True
        ),
        sa.Column("receipt_number", sa.String(50), unique=True),
        sa.Column("failure_reason", sa.String(255)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("settled_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "status IN ('succeeded','failed')", name="ck_payment_status"
        ),
        sa.CheckConstraint("amount_paise > 0", name="ck_payment_amount"),
        sa.ForeignKeyConstraint(
            ["invoice_id"], ["finance_invoices.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["resident_id"], ["users.user_id"], ondelete="RESTRICT"
        ),
    )
    op.create_index(
        "ix_finance_payments_invoice_id", "finance_payments", ["invoice_id"]
    )
    op.create_index(
        "ix_finance_payments_resident_id", "finance_payments", ["resident_id"]
    )
    op.create_table(
        "finance_expenses",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("vendor", sa.String(150), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount_paise", sa.BigInteger(), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("recorded_by", sa.BigInteger()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("amount_paise > 0", name="ck_expense_amount"),
        sa.ForeignKeyConstraint(
            ["recorded_by"], ["users.user_id"], ondelete="SET NULL"
        ),
    )
    op.create_table(
        "finance_ledger_entries",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("resident_id", sa.BigInteger()),
        sa.Column("invoice_id", sa.BigInteger()),
        sa.Column("payment_id", sa.BigInteger()),
        sa.Column("expense_id", sa.BigInteger()),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount_paise", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "direction IN ('debit','credit')", name="ck_ledger_direction"
        ),
        sa.CheckConstraint("amount_paise > 0", name="ck_ledger_amount"),
        sa.ForeignKeyConstraint(
            ["resident_id"], ["users.user_id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["invoice_id"], ["finance_invoices.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"], ["finance_payments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["expense_id"], ["finance_expenses.id"], ondelete="RESTRICT"
        ),
    )
    for col in ("resident_id", "invoice_id", "payment_id", "expense_id", "created_at"):
        op.create_index(
            f"ix_finance_ledger_entries_{col}", "finance_ledger_entries", [col]
        )
    op.create_table(
        "finance_fund_allocations",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("category", sa.String(100), nullable=False, unique=True),
        sa.Column("basis_points", sa.Integer(), nullable=False),
        sa.Column("color", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.CheckConstraint(
            "basis_points BETWEEN 0 AND 10000", name="ck_allocation_bps"
        ),
    )
    op.create_table(
        "finance_bulk_invoice_runs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("idempotency_key", sa.String(100), nullable=False, unique=True),
        sa.Column("period", sa.String(7), nullable=False),
        sa.Column("purpose", sa.String(150), nullable=False),
        sa.Column("amount_paise", sa.BigInteger(), nullable=False),
        sa.Column("invoice_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", sa.BigInteger()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], ondelete="SET NULL"),
    )
    op.create_table(
        "finance_invoice_reminders",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("invoice_id", sa.BigInteger(), nullable=False),
        sa.Column("execution_key", sa.String(100), nullable=False),
        sa.Column("reminder_type", sa.String(30), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["invoice_id"], ["finance_invoices.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "invoice_id", "execution_key", name="uq_invoice_reminder_execution"
        ),
    )


def downgrade():
    for table in (
        "finance_invoice_reminders",
        "finance_bulk_invoice_runs",
        "finance_fund_allocations",
        "finance_ledger_entries",
        "finance_expenses",
        "finance_payments",
        "finance_invoices",
    ):
        op.drop_table(table)
