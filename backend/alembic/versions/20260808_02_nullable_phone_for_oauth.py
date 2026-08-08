"""
20260808_02_nullable_phone_for_oauth.py

Make users.phone_number nullable so Google OAuth users can exist without
a phone number before they complete their profile.

Previously phone_number was NOT NULL because all traditional signups require one.
Google OAuth users are created without a phone number and must provide it during
/complete-profile before they can access the app.
"""

from alembic import op
import sqlalchemy as sa

revision = "20260808_03"
down_revision = "20260808_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove any leftover sentinel placeholder values from a failed earlier attempt
    op.execute(
        "UPDATE users SET phone_number = NULL WHERE phone_number LIKE '\\_\\_google\\_\\_%'"
    )

    # Make phone_number nullable
    op.alter_column(
        "users",
        "phone_number",
        existing_type=sa.String(20),
        nullable=True,
    )

    # The UNIQUE constraint must stay — NULL values don't violate it in Postgres
    # (each NULL is distinct), so no special handling needed.


def downgrade() -> None:
    # Backfill any NULLs before restoring NOT NULL (set a placeholder so it doesn't fail)
    op.execute(
        "UPDATE users SET phone_number = '__restored__' || user_id::text WHERE phone_number IS NULL"
    )
    op.alter_column(
        "users",
        "phone_number",
        existing_type=sa.String(20),
        nullable=False,
    )
