"""
app/db/models/transaction.py — SQLAlchemy model for society financial transactions.
"""

import enum

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    unit_or_vendor = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)

    # Always positive; direction expressed by `type`
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(SAEnum(TransactionType, name="transactiontype"), nullable=False)

    description = Column(Text, nullable=True)

    # FK to the admin who recorded this entry
    recorded_by = Column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_date = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    recorder = relationship("User", foreign_keys=[recorded_by])
