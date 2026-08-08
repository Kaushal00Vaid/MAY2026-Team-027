from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db.database import Base


class OperationalTask(Base):
    __tablename__ = "operational_tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','in_progress','completed','cancelled')",
            name="ck_operational_task_status",
        ),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    location = Column(String(200), nullable=False)
    category = Column(String(80), nullable=False, server_default="General")
    assigned_to = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    status = Column(String(20), nullable=False, server_default="pending", index=True)
    due_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    completion_notes = Column(Text)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class InventoryUnit(Base):
    __tablename__ = "inventory_units"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    symbol = Column(String(20), nullable=False, unique=True)


class Vendor(Base):
    __tablename__ = "inventory_vendors"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True)
    phone = Column(String(20))
    email = Column(String(255))
    is_active = Column(Boolean, nullable=False, server_default="true")


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_inventory_quantity"),
        CheckConstraint(
            "reorder_threshold >= 0", name="ck_inventory_reorder_threshold"
        ),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    category = Column(String(100), nullable=False)
    unit_id = Column(
        BigInteger,
        ForeignKey("inventory_units.id", ondelete="RESTRICT"),
        nullable=False,
    )
    vendor_id = Column(
        BigInteger, ForeignKey("inventory_vendors.id", ondelete="SET NULL")
    )
    quantity = Column(Numeric(14, 3), nullable=False, server_default="0")
    reorder_threshold = Column(Numeric(14, 3), nullable=False, server_default="0")
    is_active = Column(Boolean, nullable=False, server_default="true", index=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class StockMovement(Base):
    __tablename__ = "inventory_stock_movements"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('received','consumed','adjusted')",
            name="ck_stock_movement_type",
        ),
        CheckConstraint("quantity_delta <> 0", name="ck_stock_movement_nonzero"),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    item_id = Column(
        BigInteger,
        ForeignKey("inventory_items.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    movement_type = Column(String(20), nullable=False)
    quantity_delta = Column(Numeric(14, 3), nullable=False)
    resulting_quantity = Column(Numeric(14, 3), nullable=False)
    note = Column(String(500), nullable=False)
    recorded_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )


class ShiftAssignment(Base):
    __tablename__ = "staff_shift_assignments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','on_leave','inactive')", name="ck_shift_status"
        ),
        CheckConstraint("days_mask BETWEEN 1 AND 127", name="ck_shift_days_mask"),
        UniqueConstraint(
            "staff_id", "start_time", "days_mask", name="uq_staff_shift_pattern"
        ),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    staff_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_label = Column(String(100), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    days_mask = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, server_default="active")
    assigned_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"
    __table_args__ = (
        UniqueConstraint(
            "staff_id", "attendance_date", name="uq_staff_attendance_date"
        ),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    staff_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date = Column(Date, nullable=False)
    check_in_at = Column(DateTime(timezone=True))
    check_out_at = Column(DateTime(timezone=True))
    status = Column(String(20), nullable=False, server_default="present")
