from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class ComplaintComment(Base):
    __tablename__ = "complaint_comments"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    complaint_id = Column(
        BigInteger,
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    body = Column(Text, nullable=False)
    is_internal = Column(Boolean, nullable=False, server_default="false")

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    author = relationship("User")
    complaint = relationship("Complaint", back_populates="comments")
