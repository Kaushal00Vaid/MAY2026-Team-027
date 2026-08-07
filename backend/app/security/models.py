from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db.database import Base


class Visitor(Base):
    __tablename__ = "security_visitors"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','approved','denied','expired','inside','exited')",
            name="ck_visitor_status",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resident_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    visitor_name = Column(String(150), nullable=False)
    phone_number = Column(String(20))
    purpose = Column(String(100), nullable=False)
    vehicle_number = Column(String(30))
    resident_note = Column(Text)
    status = Column(String(20), nullable=False, server_default="pending", index=True)
    requested_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    decided_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    decision_note = Column(Text)
    requested_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    decision_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    entry_at = Column(DateTime(timezone=True))
    exit_at = Column(DateTime(timezone=True))
    version = Column(BigInteger, nullable=False, server_default="1")


class GuestPass(Base):
    __tablename__ = "security_guest_passes"
    __table_args__ = (UniqueConstraint("pin_digest", name="uq_guest_pass_pin_digest"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resident_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    guest_name = Column(String(150), nullable=False)
    phone_number = Column(String(20))
    purpose = Column(String(100), nullable=False, server_default="Guest / Friend")
    public_id = Column(String(64), unique=True, nullable=False)
    pin_digest = Column(String(64), nullable=False)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True))
    revoked_at = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AccessLog(Base):
    __tablename__ = "security_access_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resident_id = Column(
        BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), index=True
    )
    visitor_id = Column(
        BigInteger, ForeignKey("security_visitors.id", ondelete="SET NULL"), index=True
    )
    guest_pass_id = Column(
        BigInteger,
        ForeignKey("security_guest_passes.id", ondelete="SET NULL"),
        index=True,
    )
    actor_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    event_type = Column(String(40), nullable=False)
    subject_name = Column(String(150), nullable=False)
    unit = Column(String(30))
    gate = Column(String(100), nullable=False, server_default="Main Gate")
    details = Column(Text)
    occurred_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
