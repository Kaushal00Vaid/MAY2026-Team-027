from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.sql import func

from app.db.database import Base


class Amenity(Base):
    __tablename__ = "amenities"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_amenity_capacity"),
        CheckConstraint(
            "slot_minutes BETWEEN 15 AND 480", name="ck_amenity_slot_minutes"
        ),
        CheckConstraint(
            "weekly_limit BETWEEN 1 AND 50", name="ck_amenity_weekly_limit"
        ),
        CheckConstraint("operating_start < operating_end", name="ck_amenity_hours"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    image_url = Column(Text)
    capacity = Column(Integer, nullable=False, server_default="1")
    operating_start = Column(Time, nullable=False)
    operating_end = Column(Time, nullable=False)
    slot_minutes = Column(Integer, nullable=False, server_default="60")
    weekly_limit = Column(Integer, nullable=False, server_default="5")
    is_active = Column(Boolean, nullable=False, server_default="true", index=True)
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class AmenityBooking(Base):
    __tablename__ = "amenity_bookings"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_booking_time_range"),
        CheckConstraint(
            "status IN ('confirmed','cancelled','completed')", name="ck_booking_status"
        ),
        UniqueConstraint("idempotency_key", name="uq_booking_idempotency_key"),
        ExcludeConstraint(
            ("amenity_id", "="),
            (func.tstzrange(text("starts_at"), text("ends_at"), "[)"), "&&"),
            where=text("status = 'confirmed'"),
            using="gist",
            name="excl_confirmed_amenity_booking_overlap",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    amenity_id = Column(
        BigInteger,
        ForeignKey("amenities.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    resident_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    starts_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    purpose = Column(String(150), nullable=False)
    status = Column(String(20), nullable=False, server_default="confirmed", index=True)
    idempotency_key = Column(String(100), nullable=False)
    cancelled_at = Column(DateTime(timezone=True))
    cancelled_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
