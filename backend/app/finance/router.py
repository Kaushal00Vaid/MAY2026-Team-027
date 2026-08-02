"""
app/finance/router.py — Finance API routes for the Admin Dashboard.

Endpoints:
  GET  /api/finance/transactions   — list recent transactions (admin only)
  POST /api/finance/transactions   — record a new transaction (admin only)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import require_roles
from app.finance.schemas import TransactionCreate, TransactionResponse
from app.finance.service import create_transaction, list_transactions

router = APIRouter()

# Roles allowed to access finance endpoints
_ADMIN_ROLES = ("admin", "super_admin", "committee_member")


@router.get(
    "/transactions",
    response_model=List[TransactionResponse],
    summary="List recent transactions",
    description=(
        "Returns society financial transactions ordered by date (newest first). "
        "Optionally filter by `type` (`income` or `expense`). "
        "Supports pagination via `limit` and `offset`."
    ),
)
def get_transactions(
    type: Optional[str] = Query(
        None,
        description="Filter by transaction type: 'income' or 'expense'",
        pattern="^(income|expense)$",
    ),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user: User = Depends(require_roles(*_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    return list_transactions(db, type_filter=type, limit=limit, offset=offset)


@router.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a transaction",
    description=(
        "Records a new income or expense transaction for the society. "
        "`amount` must be positive; direction is expressed via `type`."
    ),
)
def post_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(require_roles(*_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    return create_transaction(db, user_id=current_user.user_id, payload=payload)
