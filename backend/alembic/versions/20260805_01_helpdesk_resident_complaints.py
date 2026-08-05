"""Resident complaint lifecycle, history, comments, and attachments.

Revision ID: 20260805_01
Revises: 0002
Create Date: 2026-08-05
"""

import sqlalchemy as sa
from alembic import op


revision = "20260805_01"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # The guards support existing development databases where create_all created
    # the legacy tables before Alembic became authoritative.
    if not inspector.has_table("complaints"):
        op.create_table(
            "complaints",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column("title", sa.String(255), nullable=True),
            sa.Column("category", sa.String(100), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("location", sa.String(255), nullable=True),
            sa.Column("priority", sa.String(50), server_default="Normal", nullable=False),
            sa.Column("status", sa.String(50), server_default="Open", nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("assigned_to", sa.BigInteger(), nullable=True),
            sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
            sa.Column("parent_id", sa.BigInteger(), nullable=True),
            sa.Column("work_order_notes", sa.Text(), nullable=True),
            sa.Column("version", sa.BigInteger(), server_default="1", nullable=False),
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
                "priority IN ('Low', 'Medium', 'High', 'Critical', 'Normal')",
                name="ck_complaints_priority",
            ),
            sa.CheckConstraint(
                "status IN ('Open', 'In Progress', 'Resolved', 'Closed')",
                name="ck_complaints_status",
            ),
            sa.CheckConstraint(
                "(latitude IS NULL AND longitude IS NULL) OR "
                "(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
                name="ck_complaints_coordinates",
            ),
            sa.ForeignKeyConstraint(["assigned_to"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["parent_id"], ["complaints.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_complaints_id", "complaints", ["id"])
        op.create_index("ix_complaints_user_id", "complaints", ["user_id"])
        op.create_index(
            "ix_complaints_status_updated", "complaints", ["status", "updated_at"]
        )

    inspector = sa.inspect(bind)
    complaint_columns = {column["name"] for column in inspector.get_columns("complaints")}
    for name, column_type in (
        ("resolution_notes", sa.Text()),
        ("resolved_at", sa.DateTime(timezone=True)),
        ("escalated_at", sa.DateTime(timezone=True)),
    ):
        if name not in complaint_columns:
            op.add_column("complaints", sa.Column(name, column_type, nullable=True))

    if not inspector.has_table("complaint_comments"):
        op.create_table(
            "complaint_comments",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("complaint_id", sa.BigInteger(), nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("is_internal", sa.Boolean(), server_default="false", nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint("length(trim(body)) > 0", name="ck_complaint_comments_body"),
            sa.ForeignKeyConstraint(
                ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_complaint_comments_complaint_id", "complaint_comments", ["complaint_id"]
        )
        op.create_index("ix_complaint_comments_id", "complaint_comments", ["id"])
    else:
        comment_columns = {
            column["name"] for column in inspector.get_columns("complaint_comments")
        }
        if "is_internal" not in comment_columns:
            op.add_column(
                "complaint_comments",
                sa.Column("is_internal", sa.Boolean(), server_default="false", nullable=False),
            )

    if not inspector.has_table("complaint_status_history"):
        op.create_table(
            "complaint_status_history",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("complaint_id", sa.BigInteger(), nullable=False),
            sa.Column("from_status", sa.String(50), nullable=True),
            sa.Column("to_status", sa.String(50), nullable=False),
            sa.Column("changed_by", sa.BigInteger(), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["changed_by"], ["users.user_id"], ondelete="SET NULL"
            ),
            sa.ForeignKeyConstraint(
                ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_complaint_status_history_complaint_id",
            "complaint_status_history",
            ["complaint_id"],
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
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.CheckConstraint(
                "status IN ('Assigned', 'In Progress', 'Resolved', 'Closed')",
                name="ck_maintenance_work_orders_status",
            ),
            sa.ForeignKeyConstraint(["assigned_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["assigned_to"], ["users.user_id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("complaint_id"),
        )
        op.create_index("ix_maintenance_work_orders_assigned_to", "maintenance_work_orders", ["assigned_to"])
        op.create_index("ix_maintenance_work_orders_complaint_id", "maintenance_work_orders", ["complaint_id"])

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
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["uploaded_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["work_order_id"], ["maintenance_work_orders.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("storage_key"),
        )
        op.create_index("ix_work_order_resolution_photos_work_order_id", "work_order_resolution_photos", ["work_order_id"])

    if not inspector.has_table("helpdesk_staff_duty_states"):
        op.create_table(
            "helpdesk_staff_duty_states",
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column("on_duty", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id"),
        )

    if not inspector.has_table("known_issue_subscriptions"):
        op.create_table(
            "known_issue_subscriptions",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("complaint_id", sa.BigInteger(), nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("complaint_id", "user_id", name="uq_known_issue_subscription"),
        )

    if not inspector.has_table("complaint_attachments"):
        op.create_table(
            "complaint_attachments",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("complaint_id", sa.BigInteger(), nullable=False),
            sa.Column("uploaded_by", sa.BigInteger(), nullable=True),
            sa.Column("original_filename", sa.String(255), nullable=False),
            sa.Column("storage_key", sa.String(500), nullable=False),
            sa.Column("mime_type", sa.String(100), nullable=False),
            sa.Column("size_bytes", sa.BigInteger(), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint("size_bytes > 0", name="ck_complaint_attachments_size"),
            sa.CheckConstraint(
                "mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')",
                name="ck_complaint_attachments_mime",
            ),
            sa.CheckConstraint(
                "(latitude IS NULL AND longitude IS NULL) OR "
                "(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
                name="ck_complaint_attachments_coordinates",
            ),
            sa.ForeignKeyConstraint(
                ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["uploaded_by"], ["users.user_id"], ondelete="SET NULL"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("storage_key"),
        )
        op.create_index(
            "ix_complaint_attachments_complaint_id",
            "complaint_attachments",
            ["complaint_id"],
        )


def downgrade() -> None:
    op.drop_table("known_issue_subscriptions")
    op.drop_table("helpdesk_staff_duty_states")
    op.drop_table("work_order_resolution_photos")
    op.drop_table("maintenance_work_orders")
    op.drop_table("complaint_attachments")
    op.drop_table("complaint_status_history")
    op.drop_table("complaint_comments")
    op.drop_table("complaints")
