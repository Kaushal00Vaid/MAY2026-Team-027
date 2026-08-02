"""
app/finance/schemas.py — Pydantic request/response models for society transactions.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TransactionCreate(BaseModel):
    """Payload for creating a new financial transaction."""

    unit_or_vendor: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unit label (e.g. 'A-102') or vendor name (e.g. 'Vendor-04')",
    )
    category: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Transaction category, e.g. 'Maintenance', 'Plumbing Repair'",
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Transaction amount — must be positive. Direction is expressed by `type`.",
    )
    type: Literal["income", "expense"] = Field(
        ...,
        description="Whether this is an income or an expense.",
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional free-text notes.",
    )
    transaction_date: Optional[datetime] = Field(
        None,
        description="Date/time of the transaction. Defaults to now if omitted.",
    )

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


class TransactionResponse(BaseModel):
    """Response shape for a single transaction — matches frontend expectations."""

    id: int
    unit_or_vendor: str
    category: str
    amount: Decimal
    type: str
    description: Optional[str]
    recorded_by: Optional[int]
    transaction_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
