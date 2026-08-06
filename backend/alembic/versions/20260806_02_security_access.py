"""Security visitors, guest passes, and access audit logs.

Revision ID: 20260806_02_security
Revises: 20260806_02
"""

import sqlalchemy as sa
from alembic import op

revision = "20260806_02_security"
down_revision = "20260806_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "security_visitors",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("resident_id", sa.BigInteger(), nullable=False),
        sa.Column("visitor_name", sa.String(150), nullable=False),
        sa.Column("phone_number", sa.String(20)), sa.Column("purpose", sa.String(100), nullable=False),
        sa.Column("vehicle_number", sa.String(30)), sa.Column("resident_note", sa.Text()),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("requested_by", sa.BigInteger()), sa.Column("decided_by", sa.BigInteger()),
        sa.Column("decision_note", sa.Text()),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("decision_at", sa.DateTime(timezone=True)), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entry_at", sa.DateTime(timezone=True)), sa.Column("exit_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.BigInteger(), server_default="1", nullable=False),
        sa.CheckConstraint("status IN ('pending','approved','denied','expired','inside','exited')", name="ck_visitor_status"),
        sa.ForeignKeyConstraint(["resident_id"], ["users.user_id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["decided_by"], ["users.user_id"], ondelete="SET NULL"), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_security_visitors_resident_id", "security_visitors", ["resident_id"])
    op.create_index("ix_security_visitors_status", "security_visitors", ["status"])
    op.create_table(
        "security_guest_passes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("resident_id", sa.BigInteger(), nullable=False), sa.Column("guest_name", sa.String(150), nullable=False),
        sa.Column("phone_number", sa.String(20)), sa.Column("purpose", sa.String(100), server_default="Guest / Friend", nullable=False),
        sa.Column("public_id", sa.String(64), nullable=False), sa.Column("pin_digest", sa.String(64), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False), sa.Column("valid_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)), sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["resident_id"], ["users.user_id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id"), sa.UniqueConstraint("pin_digest", name="uq_guest_pass_pin_digest"),
    )
    op.create_index("ix_security_guest_passes_resident_id", "security_guest_passes", ["resident_id"])
    op.create_table(
        "security_access_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("resident_id", sa.BigInteger()), sa.Column("visitor_id", sa.BigInteger()), sa.Column("guest_pass_id", sa.BigInteger()), sa.Column("actor_id", sa.BigInteger()),
        sa.Column("event_type", sa.String(40), nullable=False), sa.Column("subject_name", sa.String(150), nullable=False),
        sa.Column("unit", sa.String(30)), sa.Column("gate", sa.String(100), server_default="Main Gate", nullable=False), sa.Column("details", sa.Text()),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["resident_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["visitor_id"], ["security_visitors.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["guest_pass_id"], ["security_guest_passes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.user_id"], ondelete="SET NULL"), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_security_access_logs_resident_id", "security_access_logs", ["resident_id"])
    op.create_index("ix_security_access_logs_visitor_id", "security_access_logs", ["visitor_id"])
    op.create_index("ix_security_access_logs_guest_pass_id", "security_access_logs", ["guest_pass_id"])
    op.create_index("ix_security_access_logs_occurred_at", "security_access_logs", ["occurred_at"])


def downgrade() -> None:
    op.drop_table("security_access_logs")
    op.drop_table("security_guest_passes")
    op.drop_table("security_visitors")
