"""Add case-insensitive email uniqueness.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-05
"""

import sqlalchemy as sa
from alembic import op


revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Resolve any case-only duplicates before applying this migration.
    op.execute("UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL")
    op.create_index(
        "uq_users_email_lower",
        "users",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_users_email_lower", table_name="users")
