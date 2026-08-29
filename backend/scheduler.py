import logging
import time
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Callable
from zoneinfo import ZoneInfo

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.amenities.models import AmenityBooking
from app.config import settings
from app.db.database import SessionLocal
from app.finance.models import Invoice, InvoiceReminder
from app.realtime.service import add_notifications
from app.security.models import GuestPass, Visitor

logger = logging.getLogger("societysync.scheduler")
JobOperation = Callable[[Session, datetime], dict[str, int]]

_JOB_LOCKS: dict[str, threading.Lock] = defaultdict(threading.Lock)
_JOB_LOCKS_GUARD = threading.Lock()

def _get_job_lock(job_name: str) -> threading.Lock:
    with _JOB_LOCKS_GUARD:
        return _JOB_LOCKS[job_name]


def _uses_postgresql_advisory_lock(db: Session) -> bool:
    """Keep cross-process PostgreSQL locking; use a process lock for SQLite."""
    try:
        return db.get_bind().dialect.name == "postgresql"
    except AttributeError:
        # Lightweight test doubles model the historical PostgreSQL behavior.
        return True


def _execute_locked(
    job_name: str,
    operation: JobOperation,
    *,
    session_factory=None,
    attempts: int | None = None,
    retry_delay: float | None = None,
    sleeper=time.sleep,
) -> dict[str, int]:
    factory = session_factory or SessionLocal
    max_attempts = attempts or settings.SCHEDULER_MAX_ATTEMPTS
    delay = (
        settings.SCHEDULER_RETRY_DELAY_SECONDS if retry_delay is None else retry_delay
    )

    job_lock = _get_job_lock(job_name)
    acquired = job_lock.acquire(blocking=False)
    if not acquired:
        logger.warning("job_skipped_locked job=%s", job_name)
        return {"skipped": 1}

    try:
        for attempt in range(1, max_attempts + 1):
            db: Session = factory()
            try:
                if _uses_postgresql_advisory_lock(db):
                    locked = db.scalar(
                        text("SELECT pg_try_advisory_xact_lock(hashtext(:job_name))"),
                        {"job_name": f"societysync:{job_name}"},
                    )
                    if not locked:
                        db.rollback()
                        logger.warning("job_skipped_locked job=%s", job_name)
                        return {"skipped": 1}
                started = time.monotonic()
                result = operation(db, datetime.now(timezone.utc))
                db.commit()
                logger.info(
                    "job_succeeded job=%s attempt=%s duration_ms=%s result=%s",
                    job_name,
                    attempt,
                    round((time.monotonic() - started) * 1000),
                    result,
                )
                return result
            except Exception:
                db.rollback()
                if attempt == max_attempts:
                    logger.exception("job_failed job=%s attempts=%s", job_name, attempt)
                    raise
                logger.warning(
                    "job_retry job=%s attempt=%s", job_name, attempt, exc_info=True
                )
                sleeper(delay * (2 ** (attempt - 1)))
            finally:
                db.close()
    finally:
        job_lock.release()

    raise RuntimeError(f"Scheduled job {job_name} exhausted without a result")


def _fanout_notices(db: Session, now: datetime) -> dict[str, int]:
    result = db.execute(
        text(
            """
            INSERT INTO community_notice_deliveries (notice_id, user_id, delivered_at)
            SELECT notice.id, recipient.user_id, :delivered_at
            FROM community_notices AS notice
            CROSS JOIN users AS recipient
            WHERE notice.is_active = TRUE
              AND (notice.expires_at IS NULL OR notice.expires_at > :delivered_at)
              AND recipient.is_active = TRUE
              AND EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles role ON role.role_id = ur.role_id
                WHERE ur.user_id = recipient.user_id
                  AND role.role_name IN ('flat_owner', 'resident_rental')
              )
              AND (
                notice.target_type = 'all'
                OR (notice.target_type = 'block' AND lower(trim(notice.target_value)) = lower(trim(recipient.building_block)))
                OR (notice.target_type = 'flat' AND lower(trim(notice.target_value)) = lower(trim(recipient.flat_number)))
              )
            ON CONFLICT (notice_id, user_id) DO NOTHING
            """
        ),
        {"delivered_at": now},
    )
    return {"deliveries_created": result.rowcount or 0}


def _update_overdue_invoices(db: Session, now: datetime) -> dict[str, int]:
    today = now.astimezone(ZoneInfo(settings.SCHEDULER_TIMEZONE)).date()
    count = (
        db.query(Invoice)
        .filter(
            Invoice.status == "issued",
            Invoice.due_date < today,
        )
        .update(
            {
                Invoice.status: "overdue",
                Invoice.late_fee_paise: settings.SCHEDULER_LATE_FEE_PAISE,
                Invoice.version: Invoice.version + 1,
            },
            synchronize_session=False,
        )
    )
    return {"invoices_updated": count}


def _send_invoice_reminders(db: Session, now: datetime) -> dict[str, int]:
    today = now.astimezone(ZoneInfo(settings.SCHEDULER_TIMEZONE)).date()
    reminder_dates = {
        today + timedelta(days=3): "due_soon",
        today: "due_today",
    }
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.status.in_(["issued", "overdue"]),
            Invoice.due_date.in_(reminder_dates),
        )
        .all()
    )
    keys = {
        invoice.id: f"{reminder_dates[invoice.due_date]}:{today.isoformat()}"
        for invoice in invoices
    }
    existing = set()
    if keys:
        existing = {
            (invoice_id, execution_key)
            for invoice_id, execution_key in db.query(
                InvoiceReminder.invoice_id,
                InvoiceReminder.execution_key,
            )
            .filter(
                InvoiceReminder.invoice_id.in_(keys),
                InvoiceReminder.execution_key.in_(keys.values()),
            )
            .all()
        }

    created = 0
    for invoice in invoices:
        execution_key = keys[invoice.id]
        if (invoice.id, execution_key) in existing:
            continue
        reminder_type = reminder_dates[invoice.due_date]
        db.add(
            InvoiceReminder(
                invoice_id=invoice.id,
                execution_key=execution_key,
                reminder_type=reminder_type,
            )
        )
        amount_paise = invoice.base_amount_paise + invoice.late_fee_paise
        add_notifications(
            db,
            [invoice.resident_id],
            event_type="finance.invoice_reminder",
            title="Payment due soon"
            if reminder_type == "due_soon"
            else "Payment due today",
            message=f"Invoice {invoice.invoice_number} for ₹{amount_paise / 100:,.2f} is due on {invoice.due_date:%d %b %Y}.",
            resource_type="invoice",
            resource_id=invoice.id,
            payload={"scope": "finance", "reminder_type": reminder_type},
        )
        created += 1
    return {"reminders_created": created}


def _expire_visitors_and_passes(db: Session, now: datetime) -> dict[str, int]:
    visitor_count = (
        db.query(Visitor)
        .filter(
            Visitor.status == "pending",
            Visitor.expires_at < now,
        )
        .update(
            {Visitor.status: "expired", Visitor.version: Visitor.version + 1},
            synchronize_session=False,
        )
    )
    pass_count = (
        db.query(GuestPass)
        .filter(
            GuestPass.valid_until < now,
            GuestPass.used_at.is_(None),
            GuestPass.revoked_at.is_(None),
        )
        .update({GuestPass.revoked_at: now}, synchronize_session=False)
    )
    return {"visitors_expired": visitor_count, "passes_revoked": pass_count}


def _complete_amenity_bookings(db: Session, now: datetime) -> dict[str, int]:
    count = (
        db.query(AmenityBooking)
        .filter(
            AmenityBooking.status == "confirmed",
            AmenityBooking.ends_at < now,
        )
        .update({AmenityBooking.status: "completed"}, synchronize_session=False)
    )
    return {"bookings_completed": count}


def fanout_notices():
    return _execute_locked("fanout_notices", _fanout_notices)


def update_overdue_invoices():
    return _execute_locked("update_overdue_invoices", _update_overdue_invoices)


def send_invoice_reminders():
    return _execute_locked("send_invoice_reminders", _send_invoice_reminders)


def expire_visitors_and_passes():
    return _execute_locked("expire_visitors_and_passes", _expire_visitors_and_passes)


def complete_amenity_bookings():
    return _execute_locked("complete_amenity_bookings", _complete_amenity_bookings)


JOBS = (
    ("fanout_notices", fanout_notices),
    ("update_overdue_invoices", update_overdue_invoices),
    ("send_invoice_reminders", send_invoice_reminders),
    ("expire_visitors_and_passes", expire_visitors_and_passes),
    ("complete_amenity_bookings", complete_amenity_bookings),
)


def _scheduler_event(event):
    if event.code == EVENT_JOB_MISSED:
        logger.error(
            "job_missed job=%s scheduled_at=%s", event.job_id, event.scheduled_run_time
        )
    else:
        logger.error(
            "job_error job=%s",
            event.job_id,
            exc_info=(
                type(event.exception),
                event.exception,
                event.exception.__traceback__,
            ),
        )


def build_scheduler() -> BlockingScheduler:
    scheduler = BlockingScheduler(
        timezone=settings.SCHEDULER_TIMEZONE,
        job_defaults={
            "coalesce": True,
            "max_instances": 1,
            "misfire_grace_time": settings.SCHEDULER_MISFIRE_GRACE_SECONDS,
        },
    )
    scheduler.add_listener(_scheduler_event, EVENT_JOB_ERROR | EVENT_JOB_MISSED)
    scheduler.add_job(
        fanout_notices,
        "interval",
        seconds=settings.SCHEDULER_FANOUT_INTERVAL_SECONDS,
        id="fanout_notices",
        replace_existing=True,
    )
    scheduler.add_job(
        expire_visitors_and_passes,
        "interval",
        seconds=settings.SCHEDULER_EXPIRY_INTERVAL_SECONDS,
        id="expire_visitors_and_passes",
        replace_existing=True,
    )
    scheduler.add_job(
        complete_amenity_bookings,
        "interval",
        seconds=settings.SCHEDULER_BOOKING_INTERVAL_SECONDS,
        id="complete_amenity_bookings",
        replace_existing=True,
    )
    scheduler.add_job(
        update_overdue_invoices,
        "cron",
        hour=0,
        minute=5,
        id="update_overdue_invoices",
        replace_existing=True,
    )
    scheduler.add_job(
        send_invoice_reminders,
        "cron",
        hour=9,
        minute=0,
        id="send_invoice_reminders",
        replace_existing=True,
    )
    return scheduler


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    scheduler = build_scheduler()
    if settings.SCHEDULER_RUN_ON_STARTUP:
        for job_name, job in JOBS:
            try:
                job()
            except Exception:
                logger.exception("startup_job_failed job=%s", job_name)
    logger.info(
        "scheduler_started timezone=%s jobs=%s", settings.SCHEDULER_TIMEZONE, len(JOBS)
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("scheduler_stopped")


if __name__ == "__main__":
    main()
