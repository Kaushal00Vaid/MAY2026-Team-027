"""
app/finance/service.py — Business logic for society financial transactions.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.future import select

from app.db.models.transaction import Transaction, TransactionType
from app.finance.schemas import TransactionCreate


def list_transactions(
    db: Session,
    *,
    type_filter: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
) -> list[Transaction]:
    """
    Return transactions ordered by transaction_date DESC.
    Optionally filter by type: 'income' | 'expense'.
    """
    stmt = select(Transaction).order_by(Transaction.transaction_date.desc())

    if type_filter in ("income", "expense"):
        stmt = stmt.where(Transaction.type == TransactionType(type_filter))

    stmt = stmt.limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def create_transaction(
    db: Session,
    *,
    user_id: int,
    payload: TransactionCreate,
) -> Transaction:
    """Create and persist a new financial transaction."""
    tx = Transaction(
        unit_or_vendor=payload.unit_or_vendor,
        category=payload.category,
        amount=payload.amount,
        type=TransactionType(payload.type),
        description=payload.description,
        recorded_by=user_id,
        transaction_date=payload.transaction_date or datetime.now(timezone.utc),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx
