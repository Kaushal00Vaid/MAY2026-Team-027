from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.finance.models import FundAllocation, Invoice, LedgerEntry, Payment
from app.finance.operations import late_fee


def seed_finance(db: Session) -> None:
    schema = inspect(db.get_bind())
    required = {
        "finance_invoices",
        "finance_payments",
        "finance_ledger_entries",
        "finance_expenses",
        "finance_fund_allocations",
        "finance_bulk_invoice_runs",
    }
    missing = sorted(table for table in required if not schema.has_table(table))
    if missing:
        raise RuntimeError(
            "Finance database schema is not current (missing tables: "
            + ", ".join(missing)
            + "). Run 'alembic upgrade head' before running the seed command."
        )

    allocation_rows = (
        ("Security", 4000, "#0f2336"),
        ("Maintenance", 3000, "#5f8787"),
        ("Reserves", 2000, "#d87943"),
        ("Events", 1000, "#fbcb97"),
    )
    for category, basis_points, color in allocation_rows:
        if not db.scalar(
            select(FundAllocation).where(FundAllocation.category == category)
        ):
            db.add(
                FundAllocation(
                    category=category, basis_points=basis_points, color=color
                )
            )

    residents = list(
        db.scalars(
            select(User)
            .where(User.flat_number.is_not(None), User.is_active.is_(True))
            .order_by(User.user_id)
        ).all()
    )
    if not residents:
        raise RuntimeError(
            "Finance seed requires resident demo users. Run the Helpdesk seed first."
        )

    today = datetime.now(timezone.utc).date()
    period = today.strftime("%Y-%m")
    for index, user in enumerate(residents, start=1):
        invoice = db.scalar(
            select(Invoice).where(
                Invoice.resident_id == user.user_id,
                Invoice.purpose == "Monthly Maintenance",
                Invoice.period == period,
            )
        )
        if invoice:
            continue
        base_amount = 120_000 + ((index - 1) * 15_000)
        due_date = today - timedelta(days=10 + index)
        fee = late_fee(base_amount, due_date, today)
        invoice = Invoice(
            invoice_number=f"INV-{period.replace('-', '')}-{user.user_id}",
            resident_id=user.user_id,
            purpose="Monthly Maintenance",
            period=period,
            base_amount_paise=base_amount,
            late_fee_paise=fee,
            status="overdue",
            due_date=due_date,
        )
        db.add(invoice)
        db.flush()
        db.add(
            LedgerEntry(
                resident_id=user.user_id,
                invoice_id=invoice.id,
                direction="debit",
                category="Receivable",
                description=f"Monthly Maintenance — {period}",
                amount_paise=base_amount,
            )
        )
        if fee:
            db.add(
                LedgerEntry(
                    resident_id=user.user_id,
                    invoice_id=invoice.id,
                    direction="debit",
                    category="Late Fee",
                    description=f"Staggered late fee — {invoice.invoice_number}",
                    amount_paise=fee,
                )
            )

    # A settled historical invoice makes payment history and receipt download
    # testable without changing the current outstanding invoice.
    user = residents[0]
    previous_date = today.replace(day=1) - timedelta(days=1)
    previous_period = previous_date.strftime("%Y-%m")
    prior = db.scalar(
        select(Invoice).where(
            Invoice.resident_id == user.user_id,
            Invoice.purpose == "Monthly Maintenance",
            Invoice.period == previous_period,
        )
    )
    if not prior:
        now = datetime.now(timezone.utc)
        prior = Invoice(
            invoice_number=f"INV-{previous_period.replace('-', '')}-{user.user_id}",
            resident_id=user.user_id,
            purpose="Monthly Maintenance",
            period=previous_period,
            base_amount_paise=120_000,
            late_fee_paise=0,
            status="paid",
            due_date=previous_date,
            paid_at=now,
        )
        db.add(prior)
        db.flush()
        db.add(
            LedgerEntry(
                resident_id=user.user_id,
                invoice_id=prior.id,
                direction="debit",
                category="Receivable",
                description=f"Monthly Maintenance — {previous_period}",
                amount_paise=120_000,
            )
        )
        payment = Payment(
            invoice_id=prior.id,
            resident_id=user.user_id,
            amount_paise=120_000,
            method="bank",
            status="succeeded",
            idempotency_key=f"seed-finance-{previous_period}-{user.user_id}",
            gateway_transaction_id=f"LOCAL-SEED-{previous_period}-{user.user_id}",
            settled_at=now,
        )
        db.add(payment)
        db.flush()
        payment.receipt_number = f"RCP-SEED-{payment.id:06d}"
        db.add(
            LedgerEntry(
                resident_id=user.user_id,
                invoice_id=prior.id,
                payment_id=payment.id,
                direction="credit",
                category="Payment",
                description=f"Payment received — {prior.invoice_number}",
                amount_paise=120_000,
            )
        )

    db.commit()
    print(
        "  [create] Finance invoices, ledger, allocations and payment demo data ready."
    )
