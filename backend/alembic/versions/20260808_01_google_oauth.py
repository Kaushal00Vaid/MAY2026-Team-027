"""
20260808_01_google_oauth.py — Add Google OAuth columns to users table.

- google_id VARCHAR(255) UNIQUE NULLABLE — stores Google sub/account ID
- is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE — tracks profile completion status
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260808_02"
down_revision = "20260808_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS supports databases where the former duplicate migration
    # was applied and the Alembic marker was later repaired to Amenities.
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)")
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
        "is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"
    )

    # Backfill: mark existing users (who registered via email/phone) as profile-complete
    # since they already provided all required information at signup.
    op.execute("UPDATE users SET is_profile_complete = TRUE WHERE google_id IS NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_google_id")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_google_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_profile_complete")
