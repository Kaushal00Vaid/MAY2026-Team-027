"""
20260808_02_nullable_phone_for_oauth.py

Make users.phone_number nullable so Google OAuth users can exist without
a phone number before they complete their profile.
"""

from alembic import op
import sqlalchemy as sa

revision = "20260808_03"
down_revision = "20260808_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use ESCAPE '/' to cleanly match literal underscores in both SQLite & Postgres
    op.execute(
        r"UPDATE users SET phone_number = NULL WHERE phone_number LIKE '/_/_google/_/%' ESCAPE '/'"
    )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "phone_number",
            existing_type=sa.String(length=20),
            nullable=True,
        )


def downgrade() -> None:
    op.execute(
        "UPDATE users SET phone_number = '__restored__' || CAST(id AS TEXT) WHERE phone_number IS NULL"
    )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "phone_number",
            existing_type=sa.String(length=20),
            nullable=False,
        )