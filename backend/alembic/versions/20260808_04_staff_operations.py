"""Staff operations, inventory, vendors, roster and attendance.

Revision ID: 20260808_04
Revises: 20260808_03
"""

import sqlalchemy as sa
from alembic import op

revision = "20260808_04"
down_revision = "20260808_03"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "operational_tasks",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("location", sa.String(200), nullable=False),
        sa.Column("category", sa.String(80), server_default="General", nullable=False),
        sa.Column("assigned_to", sa.BigInteger(), nullable=False),
        sa.Column("created_by", sa.BigInteger()),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("completion_notes", sa.Text()),
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
            "status IN ('pending','in_progress','completed','cancelled')",
            name="ck_operational_task_status",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to"], ["users.user_id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_operational_tasks_assigned_to", "operational_tasks", ["assigned_to"]
    )
    op.create_index("ix_operational_tasks_status", "operational_tasks", ["status"])
    op.create_table(
        "inventory_units",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("symbol", sa.String(20), nullable=False, unique=True),
    )
    op.create_table(
        "inventory_vendors",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(150), nullable=False, unique=True),
        sa.Column("phone", sa.String(20)),
        sa.Column("email", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
    )
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("unit_id", sa.BigInteger(), nullable=False),
        sa.Column("vendor_id", sa.BigInteger()),
        sa.Column("quantity", sa.Numeric(14, 3), server_default="0", nullable=False),
        sa.Column(
            "reorder_threshold", sa.Numeric(14, 3), server_default="0", nullable=False
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.CheckConstraint("quantity >= 0", name="ck_inventory_quantity"),
        sa.CheckConstraint(
            "reorder_threshold >= 0", name="ck_inventory_reorder_threshold"
        ),
        sa.ForeignKeyConstraint(
            ["unit_id"], ["inventory_units.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["inventory_vendors.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_inventory_items_is_active", "inventory_items", ["is_active"])
    op.create_table(
        "inventory_stock_movements",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("item_id", sa.BigInteger(), nullable=False),
        sa.Column("movement_type", sa.String(20), nullable=False),
        sa.Column("quantity_delta", sa.Numeric(14, 3), nullable=False),
        sa.Column("resulting_quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column("recorded_by", sa.BigInteger()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "movement_type IN ('received','consumed','adjusted')",
            name="ck_stock_movement_type",
        ),
        sa.CheckConstraint("quantity_delta <> 0", name="ck_stock_movement_nonzero"),
        sa.ForeignKeyConstraint(
            ["item_id"], ["inventory_items.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by"], ["users.user_id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_inventory_stock_movements_item_id", "inventory_stock_movements", ["item_id"]
    )
    op.create_index(
        "ix_inventory_stock_movements_created_at",
        "inventory_stock_movements",
        ["created_at"],
    )
    op.create_table(
        "staff_shift_assignments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("staff_id", sa.BigInteger(), nullable=False),
        sa.Column("role_label", sa.String(100), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("days_mask", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("assigned_by", sa.BigInteger()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('active','on_leave','inactive')", name="ck_shift_status"
        ),
        sa.CheckConstraint("days_mask BETWEEN 1 AND 127", name="ck_shift_days_mask"),
        sa.ForeignKeyConstraint(["staff_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["assigned_by"], ["users.user_id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint(
            "staff_id", "start_time", "days_mask", name="uq_staff_shift_pattern"
        ),
    )
    op.create_index(
        "ix_staff_shift_assignments_staff_id", "staff_shift_assignments", ["staff_id"]
    )
    op.create_table(
        "staff_attendance",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("staff_id", sa.BigInteger(), nullable=False),
        sa.Column("attendance_date", sa.Date(), nullable=False),
        sa.Column("check_in_at", sa.DateTime(timezone=True)),
        sa.Column("check_out_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(20), server_default="present", nullable=False),
        sa.ForeignKeyConstraint(["staff_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "staff_id", "attendance_date", name="uq_staff_attendance_date"
        ),
    )
    op.create_index("ix_staff_attendance_staff_id", "staff_attendance", ["staff_id"])


def downgrade():
    for table in (
        "staff_attendance",
        "staff_shift_assignments",
        "inventory_stock_movements",
        "inventory_items",
        "inventory_vendors",
        "inventory_units",
        "operational_tasks",
    ):
        op.drop_table(table)
