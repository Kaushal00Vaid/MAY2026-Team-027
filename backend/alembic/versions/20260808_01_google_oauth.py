"""
20260808_01_google_oauth.py — Add Google OAuth columns to users table.

- google_id VARCHAR(255) UNIQUE NULLABLE — stores Google sub/account ID
- is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE — tracks profile completion status
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260808_02"
down_revision = "20260808_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    # IF NOT EXISTS supports databases where the former duplicate migration
    # was applied and the Alembic marker was later repaired to Amenities.
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)")
        op.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE"
        )
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"
        )
    else:
        op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
        op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
        op.add_column(
            "users",
            sa.Column("is_profile_complete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )

    # Backfill: mark existing users (who registered via email/phone) as profile-complete
    # since they already provided all required information at signup.
    op.execute("UPDATE users SET is_profile_complete = TRUE WHERE google_id IS NULL")

def downgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_users_google_id")
        op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_id")
        op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_profile_complete")
    else:
        op.drop_index("ix_users_google_id", table_name="users")
        op.drop_column("users", "is_profile_complete")
        op.drop_column("users", "google_id")