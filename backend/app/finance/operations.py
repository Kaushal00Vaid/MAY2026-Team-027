import secrets
from io import BytesIO
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from xml.sax.saxutils import escape

from fastapi import HTTPException
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models.role import RoleName, UserRole
from app.db.models.user import User
from app.realtime.service import add_notifications
from app.finance.models import (
    BulkInvoiceRun,
    Expense,
    FundAllocation,
    Invoice,
    LedgerEntry,
    Payment,
)

IST = ZoneInfo("Asia/Kolkata")
OPS = {
    RoleName.super_admin.value,
    RoleName.admin.value,
    RoleName.committee_member.value,
}
RESIDENTS = {RoleName.flat_owner.value, RoleName.resident_rental.value}


def roles(user):
    return {a.role.role_name.value for a in user.roles}


def operational(user):
    return bool(roles(user) & OPS)


def resident(user):
    return bool(roles(user) & RESIDENTS)


def ensure_ops(user):
    if not operational(user):
        raise HTTPException(
            status_code=403, detail="Finance administration access required."
        )


def ensure_resident(user):
    if not resident(user):
        raise HTTPException(status_code=403, detail="Resident finance access required.")


def money(paise: int) -> str:
    return f"₹{paise / 100:,.2f}"


def late_fee(base: int, due: date, today: date | None = None) -> int:
    days = ((today or datetime.now(IST).date()) - due).days
    if days <= 0:
        return 0
    if days <= 7:
        return round(base * 0.02)
    if days <= 30:
        return round(base * 0.05)
    return round(base * 0.10)


def refresh_invoice(item: Invoice, db: Session | None = None) -> None:
    if item.status in {"paid", "cancelled"}:
        return
    previous_fee = item.late_fee_paise
    fee = late_fee(item.base_amount_paise, item.due_date)
    item.late_fee_paise = fee
    item.status = "overdue" if fee else "issued"
    if db is not None and fee > previous_fee:
        db.add(
            LedgerEntry(
                resident_id=item.resident_id,
                invoice_id=item.id,
                direction="debit",
                category="Late Fee",
                description=f"Staggered late fee — {item.invoice_number}",
                amount_paise=fee - previous_fee,
            )
        )


def invoice_dict(db, item):
    refresh_invoice(item)
    user = db.get(User, item.resident_id)
    total = item.base_amount_paise + item.late_fee_paise
    return {
        "id": item.id,
        "invoice_number": item.invoice_number,
        "purpose": item.purpose,
        "period": item.period,
        "base_amount_paise": item.base_amount_paise,
        "late_fee_paise": item.late_fee_paise,
        "total_amount_paise": total,
        "amount_display": money(total),
        "status": item.status,
        "due_date": item.due_date,
        "issued_at": item.issued_at,
        "paid_at": item.paid_at,
        "unit": user.flat_number,
        "resident_name": f"{user.first_name} {user.last_name}",
        "version": item.version,
    }


def payment_dict(item):
    return {
        "id": item.id,
        "invoice_id": item.invoice_id,
        "amount_paise": item.amount_paise,
        "amount_display": money(item.amount_paise),
        "method": item.method,
        "status": item.status,
        "gateway_transaction_id": item.gateway_transaction_id,
        "receipt_number": item.receipt_number,
        "failure_reason": item.failure_reason,
        "created_at": item.created_at,
        "settled_at": item.settled_at,
    }


def ledger_dict(db, item):
    user = db.get(User, item.resident_id) if item.resident_id else None
    reference = (
        f"INV-{item.invoice_id}"
        if item.invoice_id
        else f"PAY-{item.payment_id}"
        if item.payment_id
        else f"EXP-{item.expense_id}"
    )
    return {
        "id": item.id,
        "date": item.created_at,
        "description": item.description,
        "category": item.category,
        "direction": item.direction,
        "amount_paise": item.amount_paise,
        "amount_display": money(item.amount_paise),
        "unit": user.flat_number if user else None,
        "reference": reference,
        "payment_id": item.payment_id,
    }


def bulk_invoices(db: Session, user: User, data, key: str):
    ensure_ops(user)
    # Transaction-scoped PostgreSQL locks make concurrent retries deterministic,
    # including requests that use different keys for the same billing period.
    db.execute(select(func.pg_advisory_xact_lock(func.hashtext(f"finance-key:{key}"))))
    db.execute(
        select(
            func.pg_advisory_xact_lock(
                func.hashtext(f"finance-run:{data.period}:{data.purpose}")
            )
        )
    )
    active_users = list(
        db.scalars(
            select(User)
            .options(selectinload(User.roles).selectinload(UserRole.role))
            .where(User.is_active.is_(True))
            .order_by(User.user_id)
        ).all()
    )
    resident_accounts = [candidate for candidate in active_users if resident(candidate)]
    skipped_resident_count = sum(1 for candidate in resident_accounts if not candidate.flat_number)

    # A flat can have an owner and one or more tenants. Billing is flat-based,
    # so select one deterministic recipient, preferring the owner account.
    recipients_by_flat = {}
    for candidate in (item for item in resident_accounts if item.flat_number):
        flat_key = (
            (candidate.building_block or "").strip().casefold(),
            candidate.flat_number.strip().casefold(),
        )
        current = recipients_by_flat.get(flat_key)
        candidate_is_owner = RoleName.flat_owner.value in roles(candidate)
        current_is_owner = current and RoleName.flat_owner.value in roles(current)
        if current is None or (candidate_is_owner and not current_is_owner):
            recipients_by_flat[flat_key] = candidate

    recipients = list(recipients_by_flat.values())
    skipped_resident_count += sum(
        1 for candidate in resident_accounts if candidate.flat_number
    ) - len(recipients)
    existing_flat_rows = db.execute(
        select(User.building_block, User.flat_number)
        .join(Invoice, Invoice.resident_id == User.user_id)
        .where(Invoice.purpose == data.purpose, Invoice.period == data.period)
    ).all()
    duplicate_flats = {
        ((building or "").strip().casefold(), flat.strip().casefold())
        for building, flat in existing_flat_rows
        if flat
    }

    existing = db.scalar(
        select(BulkInvoiceRun).where(BulkInvoiceRun.idempotency_key == key)
    )
    if existing:
        if (
            existing.period != data.period
            or existing.purpose != data.purpose
            or existing.amount_paise != data.amount_paise
        ):
            raise HTTPException(
                status_code=409,
                detail="Idempotency-Key was already used with a different request.",
            )
        return {
            "run_id": existing.id,
            "created_count": existing.invoice_count,
            "eligible_flat_count": len(recipients),
            "duplicate_flat_count": len(duplicate_flats & set(recipients_by_flat)),
            "skipped_resident_count": skipped_resident_count,
            "period": existing.period,
            "amount_paise": existing.amount_paise,
            "amount_display": money(existing.amount_paise),
            "message": "This invoice request was already processed.",
        }
    run = BulkInvoiceRun(
        idempotency_key=key,
        period=data.period,
        purpose=data.purpose,
        amount_paise=data.amount_paise,
        created_by=user.user_id,
    )
    db.add(run)
    db.flush()
    count = 0
    for resident_user in recipients:
        flat_key = (
            (resident_user.building_block or "").strip().casefold(),
            resident_user.flat_number.strip().casefold(),
        )
        if flat_key in duplicate_flats:
            continue
        invoice = Invoice(
            invoice_number=f"INV-{data.period.replace('-', '')}-{run.id}-{resident_user.user_id}",
            resident_id=resident_user.user_id,
            purpose=data.purpose,
            period=data.period,
            base_amount_paise=data.amount_paise,
            due_date=data.due_date,
        )
        db.add(invoice)
        db.flush()
        db.add(
            LedgerEntry(
                resident_id=resident_user.user_id,
                invoice_id=invoice.id,
                direction="debit",
                category="Receivable",
                description=f"{data.purpose} — {data.period}",
                amount_paise=data.amount_paise,
            )
        )
        count += 1
    run.invoice_count = count
    db.commit()
    duplicate_count = len(duplicate_flats & set(recipients_by_flat))
    if count:
        message = f"Created {count} invoice(s) for {data.period}."
    elif recipients and duplicate_count:
        message = "No invoices created because every eligible flat is already invoiced for this period and purpose."
    else:
        message = "No invoices created because there are no eligible active resident flats."
    return {
        "run_id": run.id,
        "created_count": count,
        "eligible_flat_count": len(recipients),
        "duplicate_flat_count": duplicate_count,
        "skipped_resident_count": skipped_resident_count,
        "period": run.period,
        "amount_paise": run.amount_paise,
        "amount_display": money(run.amount_paise),
        "message": message,
    }


def pay(db: Session, user: User, data, key: str):
    ensure_resident(user)
    db.execute(select(func.pg_advisory_xact_lock(func.hashtext(f"finance-key:{key}"))))
    old = db.scalar(select(Payment).where(Payment.idempotency_key == key))
    if old:
        if old.invoice_id != data.invoice_id or old.method != data.method:
            raise HTTPException(
                status_code=409,
                detail="Idempotency-Key was already used with a different request.",
            )
        return payment_dict(old)
    invoice = db.scalar(
        select(Invoice).where(Invoice.id == data.invoice_id).with_for_update()
    )
    if not invoice or invoice.resident_id != user.user_id:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    refresh_invoice(invoice, db)
    if invoice.status == "paid":
        raise HTTPException(status_code=409, detail="Invoice is already paid.")
    if invoice.status == "cancelled":
        raise HTTPException(
            status_code=409, detail="Cancelled invoices cannot be paid."
        )
    amount = invoice.base_amount_paise + invoice.late_fee_paise
    now = datetime.now(timezone.utc)
    gateway = f"LOCAL-{secrets.token_hex(10).upper()}"
    payment = Payment(
        invoice_id=invoice.id,
        resident_id=user.user_id,
        amount_paise=amount,
        method=data.method,
        status="failed" if data.simulate_failure else "succeeded",
        idempotency_key=key,
        gateway_transaction_id=gateway,
        failure_reason="Demo payment adapter declined the payment."
        if data.simulate_failure
        else None,
        settled_at=None if data.simulate_failure else now,
    )
    db.add(payment)
    db.flush()
    if not data.simulate_failure:
        payment.receipt_number = f"RCP-{now.astimezone(IST):%Y%m%d}-{payment.id:06d}"
        invoice.status = "paid"
        invoice.paid_at = now
        invoice.version += 1
        db.add(
            LedgerEntry(
                resident_id=user.user_id,
                invoice_id=invoice.id,
                payment_id=payment.id,
                direction="credit",
                category="Payment",
                description=f"Payment received — {invoice.invoice_number}",
                amount_paise=amount,
            )
        )
        add_notifications(
            db,
            [user.user_id],
            event_type="payment.succeeded",
            title="Payment successful",
            message=f"Payment for {invoice.invoice_number} was received successfully.",
            resource_type="payment",
            resource_id=payment.id,
            payload={"scope": "finance", "invoice_id": invoice.id, "amount_paise": amount},
        )
    db.commit()
    db.refresh(payment)
    return payment_dict(payment)


def resident_summary(db, user):
    ensure_resident(user)
    invoices = list(
        db.scalars(
            select(Invoice)
            .where(Invoice.resident_id == user.user_id)
            .order_by(Invoice.due_date.desc())
        ).all()
    )
    for item in invoices:
        refresh_invoice(item, db)
    db.commit()
    payments = list(
        db.scalars(
            select(Payment)
            .where(Payment.resident_id == user.user_id)
            .order_by(Payment.created_at.desc())
        ).all()
    )
    entries = list(
        db.scalars(
            select(LedgerEntry)
            .where(LedgerEntry.resident_id == user.user_id)
            .order_by(LedgerEntry.created_at.desc())
        ).all()
    )
    open_items = [i for i in invoices if i.status in {"issued", "overdue"}]
    outstanding = sum(i.base_amount_paise + i.late_fee_paise for i in open_items)
    fees = sum(i.late_fee_paise for i in open_items)
    allocations = [
        {"name": a.category, "value": a.basis_points / 100, "color": a.color}
        for a in db.scalars(
            select(FundAllocation).where(FundAllocation.is_active.is_(True))
        ).all()
    ]
    return {
        "outstanding_paise": outstanding,
        "outstanding_display": money(outstanding),
        "late_fee_paise": fees,
        "late_fee_display": money(fees),
        "next_due_date": min((i.due_date for i in open_items), default=None),
        "invoices": [invoice_dict(db, i) for i in invoices],
        "payments": [payment_dict(p) for p in payments],
        "ledger": [ledger_dict(db, e) for e in entries],
        "allocations": allocations,
    }


def admin_summary(db, user):
    ensure_ops(user)
    invoices = list(db.scalars(select(Invoice)).all())
    [refresh_invoice(i, db) for i in invoices]
    db.commit()
    outstanding = sum(
        i.base_amount_paise + i.late_fee_paise
        for i in invoices
        if i.status in {"issued", "overdue"}
    )
    now_ist = datetime.now(IST)
    month = datetime(now_ist.year, now_ist.month, 1, tzinfo=IST).astimezone(
        timezone.utc
    )
    collected = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(
                Payment.status == "succeeded", Payment.settled_at >= month
            )
        )
        or 0
    )
    credits = (
        db.scalar(
            select(func.coalesce(func.sum(LedgerEntry.amount_paise), 0)).where(
                LedgerEntry.direction == "credit"
            )
        )
        or 0
    )
    debits = (
        db.scalar(
            select(func.coalesce(func.sum(LedgerEntry.amount_paise), 0)).where(
                LedgerEntry.direction == "debit", LedgerEntry.expense_id.is_not(None)
            )
        )
        or 0
    )
    alloc = [
        {"name": a.category, "value": a.basis_points / 100, "color": a.color}
        for a in db.scalars(
            select(FundAllocation).where(FundAllocation.is_active.is_(True))
        ).all()
    ]
    return {
        "total_reserve_paise": max(0, credits - debits),
        "total_reserve_display": money(max(0, credits - debits)),
        "outstanding_paise": outstanding,
        "outstanding_display": money(outstanding),
        "collected_this_month_paise": collected,
        "collected_this_month_display": money(collected),
        "defaulter_count": sum(1 for i in invoices if i.status == "overdue"),
        "allocations": alloc,
    }


def ledger(db, user, page, page_size):
    ensure_ops(user)
    total = db.scalar(select(func.count(LedgerEntry.id))) or 0
    items = list(
        db.scalars(
            select(LedgerEntry)
            .order_by(LedgerEntry.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return [ledger_dict(db, i) for i in items], total


def add_expense(db, user, data):
    ensure_ops(user)
    item = Expense(**data.model_dump(), recorded_by=user.user_id)
    db.add(item)
    db.flush()
    db.add(
        LedgerEntry(
            expense_id=item.id,
            direction="debit",
            category=data.category,
            description=f"{data.vendor} — {data.description}",
            amount_paise=data.amount_paise,
        )
    )
    db.commit()
    return {"id": item.id}


def simple_pdf(title: str, lines: list[str]) -> bytes:
    safe = [title] + lines
    text = (
        "BT /F1 12 Tf 50 760 Td "
        + " ".join(
            f"({line.replace('(', '[').replace(')', ']')}) Tj 0 -18 Td" for line in safe
        )
        + " ET"
    )
    stream = text.encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for n, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out.extend(f"{n} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    [out.extend(f"{o:010d} 00000 n \n".encode()) for o in offsets[1:]]
    out.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    )
    return bytes(out)


def receipt_pdf(db, user, payment_id):
    payment = db.get(Payment, payment_id)
    if not payment or (not operational(user) and payment.resident_id != user.user_id):
        raise HTTPException(status_code=404, detail="Receipt not found.")
    if payment.status != "succeeded":
        raise HTTPException(
            status_code=409, detail="Failed payments do not have receipts."
        )
    invoice = db.get(Invoice, payment.invoice_id)
    return simple_pdf(
        "SocietySync Payment Receipt",
        [
            f"Receipt: {payment.receipt_number}",
            f"Invoice: {invoice.invoice_number}",
            f"Amount: INR {payment.amount_paise / 100:,.2f}",
            f"Transaction: {payment.gateway_transaction_id}",
        ],
    )


def statement_pdf(db, user):
    summary = resident_summary(db, user)
    lines = [
        f"Resident: {user.first_name} {user.last_name} ({user.flat_number})",
        f"Outstanding: INR {summary['outstanding_paise'] / 100:,.2f}",
    ] + [
        f"{e['date'].date()} {e['description']} INR {e['amount_paise'] / 100:,.2f} {e['direction']}"
        for e in summary["ledger"][:30]
    ]
    return simple_pdf("SocietySync Resident Statement", lines)


def audit_pdf(db, user, year: int | None = None):
    ensure_ops(user)
    report_year = year or datetime.now(IST).year
    period_start = datetime(report_year, 1, 1, tzinfo=IST).astimezone(timezone.utc)
    period_end = datetime(report_year + 1, 1, 1, tzinfo=IST).astimezone(timezone.utc)
    summary = admin_summary(db, user)
    collected = db.scalar(
        select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(
            Payment.status == "succeeded",
            Payment.settled_at >= period_start,
            Payment.settled_at < period_end,
        )
    ) or 0
    expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount_paise), 0)).where(
            Expense.expense_date >= date(report_year, 1, 1),
            Expense.expense_date < date(report_year + 1, 1, 1),
        )
    ) or 0
    invoice_rows = db.execute(
        select(Invoice.status, func.count(Invoice.id))
        .where(Invoice.issued_at >= period_start, Invoice.issued_at < period_end)
        .group_by(Invoice.status)
    ).all()
    invoice_counts = dict(invoice_rows)
    entries = list(
        db.scalars(
            select(LedgerEntry)
            .where(
                LedgerEntry.created_at >= period_start,
                LedgerEntry.created_at < period_end,
            )
            .order_by(LedgerEntry.created_at.desc())
            .limit(30)
        ).all()
    )
    def pdf_money(paise):
        return f"INR {paise / 100:,.2f}"

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"SocietySync Annual Audit Report {report_year}",
        author="SocietySync",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="AuditTitle", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=22, leading=26, textColor=colors.HexColor("#0f2336"),
        alignment=TA_CENTER, spaceAfter=5 * mm,
    ))
    styles.add(ParagraphStyle(
        name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=13, textColor=colors.HexColor("#0f2336"), spaceBefore=5 * mm,
        spaceAfter=2.5 * mm,
    ))
    styles.add(ParagraphStyle(
        name="Meta", parent=styles["BodyText"], fontSize=9,
        textColor=colors.HexColor("#64748b"), alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="Small", parent=styles["BodyText"], fontSize=8, leading=10,
        textColor=colors.HexColor("#334155"),
    ))

    story = [
        Paragraph("SocietySync", styles["Meta"]),
        Paragraph("Annual Financial Audit Report", styles["AuditTitle"]),
        Paragraph(
            f"Reporting period: 01 January {report_year} - 31 December {report_year}<br/>"
            f"Generated: {datetime.now(IST):%d %B %Y, %H:%M IST}",
            styles["Meta"],
        ),
        Spacer(1, 7 * mm),
        Paragraph("Executive summary", styles["Section"]),
    ]
    summary_data = [
        ["Collections", "Expenses", "Net cash flow"],
        [pdf_money(collected), pdf_money(expenses), pdf_money(collected - expenses)],
        ["Current reserve", "Outstanding", "Overdue invoices"],
        [pdf_money(summary["total_reserve_paise"]), pdf_money(summary["outstanding_paise"]), str(summary["defaulter_count"])],
    ]
    summary_table = Table(summary_data, colWidths=[53 * mm] * 3, rowHeights=[8 * mm, 11 * mm, 8 * mm, 11 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef5")),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#e8eef5")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f2336")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTSIZE", (0, 1), (-1, 1), 12),
        ("FONTSIZE", (0, 3), (-1, 3), 12),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(summary_table)

    story.extend([
        Paragraph("Invoice status", styles["Section"]),
        Table(
            [["Issued", "Paid", "Overdue", "Cancelled", "Total"] , [
                invoice_counts.get("issued", 0), invoice_counts.get("paid", 0),
                invoice_counts.get("overdue", 0), invoice_counts.get("cancelled", 0),
                sum(invoice_counts.values()),
            ]],
            colWidths=[31.8 * mm] * 5,
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2336")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        ),
        Paragraph("Configured fund allocation", styles["Section"]),
    ])
    allocation_rows = [["Fund", "Allocation"]] + [
        [escape(item["name"]), f'{item["value"]:.0f}%'] for item in summary["allocations"]
    ]
    if len(allocation_rows) == 1:
        allocation_rows.append(["No active allocations configured", "-"])
    allocation_table = Table(allocation_rows, colWidths=[120 * mm, 39 * mm])
    allocation_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2336")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(allocation_table)
    story.append(Paragraph("Recent ledger activity for the reporting year", styles["Section"]))
    ledger_rows = [["Date", "Reference", "Description", "Type", "Amount"]]
    ledger_rows.extend([
        [
            entry.created_at.astimezone(IST).strftime("%d %b %Y"),
            f"LED-{entry.id}",
            Paragraph(escape(entry.description[:75]), styles["Small"]),
            entry.direction.title(),
            pdf_money(entry.amount_paise),
        ]
        for entry in entries
    ])
    if len(ledger_rows) == 1:
        ledger_rows.append(["-", "-", "No ledger activity for this year", "-", "-"])
    ledger_table = Table(ledger_rows, colWidths=[24 * mm, 25 * mm, 66 * mm, 19 * mm, 25 * mm], repeatRows=1)
    ledger_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2336")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(KeepTogether(ledger_table))
    story.extend([
        Spacer(1, 5 * mm),
        Paragraph(
            "This system-generated report summarizes SocietySync records and should be reviewed with source documents by the society auditor.",
            styles["Small"],
        ),
    ])

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(18 * mm, 10 * mm, f"SocietySync Annual Audit {report_year}")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
