"""Amenities configuration and concurrency-safe bookings.

Revision ID: 20260808_01
Revises: 20260807_01
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ExcludeConstraint

revision = "20260808_01"
down_revision = "20260807_01"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.create_table(
        "amenities",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(150), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text()),
        sa.Column("capacity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("operating_start", sa.Time(), nullable=False),
        sa.Column("operating_end", sa.Time(), nullable=False),
        sa.Column("slot_minutes", sa.Integer(), server_default="60", nullable=False),
        sa.Column("weekly_limit", sa.Integer(), server_default="5", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_by", sa.BigInteger()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("capacity > 0", name="ck_amenity_capacity"),
        sa.CheckConstraint(
            "slot_minutes BETWEEN 15 AND 480", name="ck_amenity_slot_minutes"
        ),
        sa.CheckConstraint(
            "weekly_limit BETWEEN 1 AND 50", name="ck_amenity_weekly_limit"
        ),
        sa.CheckConstraint("operating_start < operating_end", name="ck_amenity_hours"),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], ondelete="SET NULL"),
    )
    op.create_index("ix_amenities_is_active", "amenities", ["is_active"])
    op.create_table(
        "amenity_bookings",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("amenity_id", sa.BigInteger(), nullable=False),
        sa.Column("resident_id", sa.BigInteger(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("purpose", sa.String(150), nullable=False),
        sa.Column("status", sa.String(20), server_default="confirmed", nullable=False),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column("cancelled_by", sa.BigInteger()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("ends_at > starts_at", name="ck_booking_time_range"),
        sa.CheckConstraint(
            "status IN ('confirmed','cancelled','completed')", name="ck_booking_status"
        ),
        sa.ForeignKeyConstraint(["amenity_id"], ["amenities.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["resident_id"], ["users.user_id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["cancelled_by"], ["users.user_id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint("idempotency_key", name="uq_booking_idempotency_key"),
        ExcludeConstraint(
            ("amenity_id", "="),
            (sa.text("tstzrange(starts_at, ends_at, '[)')"), "&&"),
            where=sa.text("status = 'confirmed'"),
            using="gist",
            name="excl_confirmed_amenity_booking_overlap",
        ),
    )
    op.create_index(
        "ix_amenity_bookings_amenity_id", "amenity_bookings", ["amenity_id"]
    )
    op.create_index(
        "ix_amenity_bookings_resident_id", "amenity_bookings", ["resident_id"]
    )
    op.create_index("ix_amenity_bookings_starts_at", "amenity_bookings", ["starts_at"])
    op.create_index("ix_amenity_bookings_status", "amenity_bookings", ["status"])


def downgrade():
    op.drop_table("amenity_bookings")
    op.drop_table("amenities")
