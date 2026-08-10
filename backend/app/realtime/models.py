from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(80), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(80), nullable=True)
    payload = Column(JSONB, nullable=False, server_default="{}")
    is_read = Column(Boolean, nullable=False, server_default="false")
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("ix_notifications_user_created", "user_id", "created_at"),
        Index("ix_notifications_user_unread", "user_id", "is_read"),
    )


class WebSocketTicket(Base):
    __tablename__ = "websocket_tickets"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
