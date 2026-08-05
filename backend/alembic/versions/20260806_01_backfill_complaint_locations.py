"""Backfill complaint locations from resident profiles.

Revision ID: 20260806_01
Revises: 20260805_02
Create Date: 2026-08-06
"""

from alembic import op


revision = "20260806_01"
down_revision = "20260805_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Preserve every explicitly entered ticket location. Older resident tickets
    # did not expose a location input, so recover their registered flat/block.
    op.execute(
        """
        UPDATE complaints AS complaint
        SET location = COALESCE(
            NULLIF(BTRIM(resident.flat_number), ''),
            NULLIF(BTRIM(resident.building_block), '')
        )
        FROM users AS resident
        WHERE complaint.user_id = resident.user_id
          AND NULLIF(BTRIM(complaint.location), '') IS NULL
          AND COALESCE(
              NULLIF(BTRIM(resident.flat_number), ''),
              NULLIF(BTRIM(resident.building_block), '')
          ) IS NOT NULL
        """
    )


def downgrade() -> None:
    # The migration cannot distinguish a backfilled flat from an identical
    # explicitly entered location, so retaining the values is data-safe.
    pass
