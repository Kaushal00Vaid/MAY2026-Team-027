import hashlib
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from twilio.rest import Client

from app.config import settings
from app.core.exceptions import (
    OTPExpiredException,
    OTPInvalidException,
    OTPMaxAttemptsException,
    OTPRateLimitException,
)
from app.db.models.otp import OTPPurpose, OTPRecord

# ─── Constants ────────────────────────────────────────────────────────────────
MAX_VERIFY_ATTEMPTS = 5
OTP_EXPIRY_MINUTES = 10
OTP_RATE_LIMIT_COUNT = 3          # max OTP sends per window
OTP_RATE_LIMIT_WINDOW_MINUTES = 10


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _hash_otp(otp: str) -> str:
    """SHA-256 hash an OTP code before DB storage."""
    return hashlib.sha256(otp.encode()).hexdigest()


def _get_recent_send_count(db: Session, phone_number: str) -> int:
    """Count OTP records created in the rate-limit window for this phone."""
    window_start = datetime.now(timezone.utc) - timedelta(
        minutes=OTP_RATE_LIMIT_WINDOW_MINUTES
    )
    return (
        db.query(OTPRecord)
        .filter(
            OTPRecord.phone_number == phone_number,
            OTPRecord.created_at >= window_start,
        )
        .count()
    )


# ─── Public API ───────────────────────────────────────────────────────────────

def send_otp(
    db: Session,
    phone_number: str,
    purpose: OTPPurpose = OTPPurpose.login,
) -> None:
    """
    Generate a 6-digit OTP, persist its hash, and dispatch via Twilio SMS.
    Raises OTPRateLimitException if the send limit is exceeded.
    """
    if _get_recent_send_count(db, phone_number) >= OTP_RATE_LIMIT_COUNT:
        raise OTPRateLimitException()

    otp_code = str(random.randint(100_000, 999_999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    record = OTPRecord(
        phone_number=phone_number,
        otp_code_hash=_hash_otp(otp_code),
        purpose=purpose,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()

    # Send SMS via Twilio when credentials are configured
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=(
                f"Your SocietySync verification code is: {otp_code}. "
                f"Valid for {OTP_EXPIRY_MINUTES} minutes. Do not share this code."
            ),
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number,
        )


def verify_otp(
    db: Session,
    phone_number: str,
    otp_code: str,
    purpose: OTPPurpose = OTPPurpose.login,
) -> None:
    """
    Verify the OTP for a given phone number and purpose.
    Raises appropriate exceptions on failure. Marks the record as used on success.
    """
    now = datetime.now(timezone.utc)

    record: OTPRecord | None = (
        db.query(OTPRecord)
        .filter(
            OTPRecord.phone_number == phone_number,
            OTPRecord.purpose == purpose,
            OTPRecord.is_used.is_(False),
        )
        .order_by(OTPRecord.created_at.desc())
        .first()
    )

    if not record:
        raise OTPInvalidException()

    # Make expires_at timezone-aware for comparison
    record_expires = record.expires_at
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if record_expires < now:
        raise OTPExpiredException()

    if record.attempts >= MAX_VERIFY_ATTEMPTS:
        raise OTPMaxAttemptsException()

    # Increment attempt counter regardless of outcome
    record.attempts += 1

    if record.otp_code_hash != _hash_otp(otp_code):
        db.commit()
        raise OTPInvalidException()

    # Mark as used on success
    record.is_used = True
    db.commit()
