from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=True)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=True)
    priority = Column(String(50), nullable=False, server_default="Normal")
    status = Column(String(50), nullable=False, server_default="Open")

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    assigned_to = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    parent_id = Column(BigInteger, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    work_order_notes = Column(Text, nullable=True)
    version = Column(BigInteger, nullable=False, server_default="1")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    comments = relationship("ComplaintComment", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintComment.created_at")
