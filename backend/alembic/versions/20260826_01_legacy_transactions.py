"""Create the legacy finance transactions table.

Revision ID: 20260826_01
Revises: 20260809_01
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260826_01"
down_revision = "20260809_01"
branch_labels = None
depends_on = None


def upgrade():
    transaction_type = postgresql.ENUM(
        "income", "expense", name="transactiontype", create_type=False
    )
    transaction_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "transactions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("unit_or_vendor", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("type", transaction_type, nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("recorded_by", sa.BigInteger()),
        sa.Column(
            "transaction_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["recorded_by"], ["users.user_id"], ondelete="SET NULL"),
    )
    op.create_index("ix_transactions_recorded_by", "transactions", ["recorded_by"])
    op.create_index("ix_transactions_transaction_date", "transactions", ["transaction_date"])


def downgrade():
    op.drop_index("ix_transactions_transaction_date", table_name="transactions")
    op.drop_index("ix_transactions_recorded_by", table_name="transactions")
    op.drop_table("transactions")
    postgresql.ENUM(name="transactiontype").drop(op.get_bind(), checkfirst=True)
