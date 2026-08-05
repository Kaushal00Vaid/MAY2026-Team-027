"""Reconcile Helpdesk databases upgraded with an earlier 20260805_01.

Revision ID: 20260805_02
Revises: 20260805_01
Create Date: 2026-08-05

The first Helpdesk revision was used on development databases before the full
work-order implementation was added.  Alembic never replays an applied
revision, so this forward migration safely adds every later Helpdesk object
that may be missing.
"""

import sqlalchemy as sa
from alembic import op


revision = "20260805_02"
down_revision = "20260805_01"
branch_labels = None
depends_on = None


def _columns(inspector: sa.Inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    complaint_columns = _columns(inspector, "complaints")
    for name, column_type in (
        ("resolution_notes", sa.Text()),
        ("resolved_at", sa.DateTime(timezone=True)),
        ("escalated_at", sa.DateTime(timezone=True)),
    ):
        if name not in complaint_columns:
            op.add_column("complaints", sa.Column(name, column_type, nullable=True))

    if inspector.has_table("complaint_comments"):
        if "is_internal" not in _columns(inspector, "complaint_comments"):
            op.add_column(
                "complaint_comments",
                sa.Column(
                    "is_internal",
                    sa.Boolean(),
                    server_default=sa.text("false"),
                    nullable=False,
                ),
            )

    if not inspector.has_table("maintenance_work_orders"):
        op.create_table(
            "maintenance_work_orders",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("complaint_id", sa.BigInteger(), nullable=False),
            sa.Column("assigned_to", sa.BigInteger(), nullable=False),
            sa.Column("assigned_by", sa.BigInteger(), nullable=True),
            sa.Column("status", sa.String(30), server_default="Assigned", nullable=False),
            sa.Column("instructions", sa.JSON(), nullable=False),
            sa.Column("resolution_notes", sa.Text(), nullable=True),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
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
            sa.CheckConstraint(
                "status IN ('Assigned', 'In Progress', 'Resolved', 'Closed')",
                name="ck_maintenance_work_orders_status",
            ),
            sa.ForeignKeyConstraint(
                ["assigned_by"], ["users.user_id"], ondelete="SET NULL"
            ),
            sa.ForeignKeyConstraint(
                ["assigned_to"], ["users.user_id"], ondelete="RESTRICT"
            ),
            sa.ForeignKeyConstraint(
                ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("complaint_id"),
        )
        op.create_index(
            "ix_maintenance_work_orders_assigned_to",
            "maintenance_work_orders",
            ["assigned_to"],
        )
        op.create_index(
            "ix_maintenance_work_orders_complaint_id",
            "maintenance_work_orders",
            ["complaint_id"],
        )

    inspector = sa.inspect(bind)
    if not inspector.has_table("work_order_resolution_photos"):
        op.create_table(
            "work_order_resolution_photos",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("work_order_id", sa.BigInteger(), nullable=False),
            sa.Column("uploaded_by", sa.BigInteger(), nullable=True),
            sa.Column("original_filename", sa.String(255), nullable=False),
            sa.Column("storage_key", sa.String(500), nullable=False),
            sa.Column("mime_type", sa.String(100), nullable=False),
            sa.Column("size_bytes", sa.BigInteger(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["uploaded_by"], ["users.user_id"], ondelete="SET NULL"
            ),
            sa.ForeignKeyConstraint(
                ["work_order_id"],
                ["maintenance_work_orders.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("storage_key"),
        )
        op.create_index(
            "ix_work_order_resolution_photos_work_order_id",
            "work_order_resolution_photos",
            ["work_order_id"],
        )

    if not inspector.has_table("helpdesk_staff_duty_states"):
        op.create_table(
            "helpdesk_staff_duty_states",
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column("on_duty", sa.Boolean(), server_default="true", nullable=False),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["user_id"], ["users.user_id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("user_id"),
        )

    if not inspector.has_table("known_issue_subscriptions"):
        op.create_table(
            "known_issue_subscriptions",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("complaint_id", sa.BigInteger(), nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["user_id"], ["users.user_id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "complaint_id", "user_id", name="uq_known_issue_subscription"
            ),
        )


def downgrade() -> None:
    # This is a schema-repair migration. Dropping these objects could destroy
    # data created by 20260805_01, so downgrade intentionally preserves them.
    pass
