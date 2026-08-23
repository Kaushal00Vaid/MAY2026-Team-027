from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Header, Query, Response, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user
from app.finance import operations
from app.finance.contracts import (
    AdminFinanceSummary,
    BulkInvoiceCreate,
    BulkInvoiceResponse,
    ExpenseCreate,
    PaginatedLedger,
    PaymentCreate,
    PaymentResponse,
    ResidentFinanceSummary,
)

router = APIRouter()


@router.get("/resident-summary", response_model=ResidentFinanceSummary)
def resident_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return operations.resident_summary(db, user)


@router.get("/admin-summary", response_model=AdminFinanceSummary)
def admin_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return operations.admin_summary(db, user)


@router.get("/ledger", response_model=PaginatedLedger)
def ledger(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    direction: Literal["credit", "debit"] | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = operations.ledger(db, user, page, page_size, direction)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post(
    "/invoices/bulk",
    response_model=BulkInvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def bulk(
    data: BulkInvoiceCreate,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=100
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return operations.bulk_invoices(db, user, data, idempotency_key)


@router.post(
    "/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED
)
def payment(
    data: PaymentCreate,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=100
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return operations.pay(db, user, data, idempotency_key)


@router.post("/expenses", status_code=status.HTTP_201_CREATED)
def expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return operations.add_expense(db, user, data)


def pdf_response(content, filename):
    return Response(
        content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/payments/{payment_id}/receipt")
def receipt(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return pdf_response(
        operations.receipt_pdf(db, user, payment_id), f"receipt-{payment_id}.pdf"
    )


@router.get("/statement")
def statement(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return pdf_response(operations.statement_pdf(db, user), "resident-statement.pdf")


@router.get("/reports/annual-audit")
def annual_audit(
    year: int = Query(datetime.now().year, ge=2000, le=2100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return pdf_response(
        operations.audit_pdf(db, user, year), f"annual-audit-{year}.pdf"
    )
