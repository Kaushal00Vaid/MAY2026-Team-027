from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class MaintenanceWorkOrder(Base):
    __tablename__ = "maintenance_work_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    complaint_id = Column(
        BigInteger,
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    assigned_to = Column(
        BigInteger, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assigned_by = Column(
        BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    status = Column(String(30), nullable=False, server_default="Assigned")
    instructions = Column(JSON, nullable=False, default=list)
    resolution_notes = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, server_default="1")
    started_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    complaint = relationship("Complaint", back_populates="work_order")
    assignee = relationship("User", foreign_keys=[assigned_to])
    assigner = relationship("User", foreign_keys=[assigned_by])
    resolution_photos = relationship(
        "WorkOrderResolutionPhoto",
        back_populates="work_order",
        cascade="all, delete-orphan",
    )


class WorkOrderResolutionPhoto(Base):
    __tablename__ = "work_order_resolution_photos"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id = Column(
        BigInteger,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by = Column(
        BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    original_filename = Column(String(255), nullable=False)
    storage_key = Column(String(500), nullable=False, unique=True)
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    work_order = relationship("MaintenanceWorkOrder", back_populates="resolution_photos")


class StaffDutyState(Base):
    __tablename__ = "helpdesk_staff_duty_states"

    user_id = Column(
        BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    on_duty = Column(Boolean, nullable=False, server_default="true")
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User")


class KnownIssueSubscription(Base):
    __tablename__ = "known_issue_subscriptions"
    __table_args__ = (
        UniqueConstraint("complaint_id", "user_id", name="uq_known_issue_subscription"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    complaint_id = Column(
        BigInteger, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

