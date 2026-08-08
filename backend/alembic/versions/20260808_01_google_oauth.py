"""
20260808_01_google_oauth.py — Add Google OAuth columns to users table.

- google_id VARCHAR(255) UNIQUE NULLABLE — stores Google sub/account ID
- is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE — tracks profile completion status
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260808_01"
down_revision = "20260807_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add google_id column
    op.add_column(
        "users",
        sa.Column("google_id", sa.String(255), nullable=True),
    )
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    # Add is_profile_complete column
    op.add_column(
        "users",
        sa.Column(
            "is_profile_complete",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # Backfill: mark existing users (who registered via email/phone) as profile-complete
    # since they already provided all required information at signup.
    op.execute("UPDATE users SET is_profile_complete = TRUE WHERE google_id IS NULL")


def downgrade() -> None:
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_column("users", "google_id")
    op.drop_column("users", "is_profile_complete")
