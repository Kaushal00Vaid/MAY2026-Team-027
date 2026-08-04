"""
auth/service.py — Core authentication business logic.

All DB-touching operations live here; the router only calls these functions.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from app.auth.otp_service import OTPPurpose, send_otp, verify_otp
from app.auth.password import hash_password, verify_password
from app.auth.schemas import SignupRequest
from app.config import settings
from app.core.exceptions import (
    AccountInactiveException,
    DuplicateEmailException,
    DuplicatePhoneException,
    InvalidCredentialsException,
    InvalidTokenException,
    UserNotFoundException,
)
from app.db.models.role import RoleName, Role, UserRole
from app.db.models.token import RefreshToken
from app.db.models.user import User


# Helpers

def _get_user_role_names(user: User) -> list[str]:
    return [ur.role.role_name.value for ur in user.roles]


def _normalize_email(email: str) -> str:
    return email.strip().casefold()


def _normalize_phone(phone_number: str) -> str:
    phone_number = phone_number.strip()
    return phone_number if phone_number.startswith("+") else f"+{phone_number}"


def _build_token_pair(
    db: Session, user: User, request: Request, *, commit: bool = True
) -> tuple[str, str]:
    """Create access + refresh tokens and persist the refresh token hash."""
    roles = _get_user_role_names(user)
    access_token = create_access_token(user.user_id, roles)
    refresh_token = create_refresh_token(user.user_id)

    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    rt_record = RefreshToken(
        user_id=user.user_id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
        user_agent=request.headers.get("user-agent", "")[:500],
        ip_address=request.client.host if request.client else None,
    )
    db.add(rt_record)
    if commit:
        db.commit()
    else:
        db.flush()

    return access_token, refresh_token


# Signup

def signup_user(db: Session, data: SignupRequest) -> User:
    """Register a new user with default flat_owner role."""
    # Uniqueness checks
    email = _normalize_email(str(data.email)) if data.email else None
    phone_number = _normalize_phone(data.phone_number)
    if email and db.query(User).filter(func.lower(User.email) == email).first():
        raise DuplicateEmailException()
    if db.query(User).filter(User.phone_number == phone_number).first():
        raise DuplicatePhoneException()

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=email,
        phone_number=phone_number,
        password_hash=hash_password(data.password) if data.password else None,
        profile_picture_url=data.profile_picture_url,
        flat_number=data.flat_number,
        building_block=data.building_block,
        staff_type=data.staff_type,
        emergency_contact=data.emergency_contact,
    )
    db.add(user)
    db.flush()  # get user_id without committing

    # Assign default role: flat_owner (resident member)
    default_role = (
        db.query(Role).filter(Role.role_name == RoleName.flat_owner).first()
    )
    if default_role:
        user_role = UserRole(user_id=user.user_id, role_id=default_role.role_id)
        db.add(user_role)

    db.commit()
    db.refresh(user)
    return user


# Password login

def login_with_password(
    db: Session, email: str, password: str, request: Request
) -> tuple[str, str]:
    """Authenticate with email + password. Returns (access_token, refresh_token)."""
    normalized_email = _normalize_email(email)
    user: Optional[User] = (
        db.query(User).filter(func.lower(User.email) == normalized_email).first()
    )
    if not user or not user.password_hash:
        raise InvalidCredentialsException()
    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsException()
    if not user.is_active:
        raise AccountInactiveException()

    # Transparently migrate credentials created before the Argon2 rollout.
    if user.password_hash.startswith("$2"):
        user.password_hash = hash_password(password)

    return _build_token_pair(db, user, request)


# OTP login

def request_otp_for_login(db: Session, phone_number: str) -> None:
    """Validate phone exists and dispatch OTP. Raises if user not found."""
    phone_number = _normalize_phone(phone_number)
    user = db.query(User).filter(User.phone_number == phone_number).first()
    if not user:
        # Generic message to avoid enumeration
        raise UserNotFoundException()
    if not user.is_active:
        raise AccountInactiveException()

    send_otp(db, phone_number, purpose=OTPPurpose.login)


def verify_otp_login(
    db: Session, phone_number: str, otp_code: str, request: Request
) -> tuple[str, str]:
    """Verify OTP and issue tokens. Returns (access_token, refresh_token)."""
    # Validate OTP first
    phone_number = _normalize_phone(phone_number)
    verify_otp(db, phone_number, otp_code, purpose=OTPPurpose.login)

    user: Optional[User] = (
        db.query(User).filter(User.phone_number == phone_number).first()
    )
    if not user:
        raise UserNotFoundException()
    if not user.is_active:
        raise AccountInactiveException()

    # Mark phone as verified on first successful OTP login
    if not user.is_phone_verified:
        user.is_phone_verified = True
        db.commit()

    return _build_token_pair(db, user, request)


# Token refresh

def refresh_access_token(
    db: Session, refresh_token: str, request: Request
) -> tuple[str, str]:
    """
    Validate refresh token from cookie, rotate it, and return new token pair.
    Old refresh token is revoked.
    """
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise InvalidTokenException()

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise InvalidTokenException() from None
    token_hash = hash_token(refresh_token)

    rt_record: Optional[RefreshToken] = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked.is_(False),
        )
        .with_for_update()
        .first()
    )
    if not rt_record:
        raise InvalidTokenException()

    # Check expiry
    expires = rt_record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise InvalidTokenException()

    # Revoke old token (rotation)
    rt_record.is_revoked = True
    rt_record.revoked_at = datetime.now(timezone.utc)
    user = db.query(User).filter(User.user_id == user_id, User.is_active.is_(True)).first()
    if not user:
        db.rollback()
        raise InvalidTokenException()

    token_pair = _build_token_pair(db, user, request, commit=False)
    db.commit()
    return token_pair


# Logout 

def logout_user(db: Session, refresh_token: str) -> None:
    """Revoke the refresh token. Access token expiry is handled client-side."""
    if not refresh_token:
        return

    payload = decode_token(refresh_token)
    if not payload:
        return

    try:
        user_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        return
    token_hash = hash_token(refresh_token)

    rt_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked.is_(False),
        )
        .first()
    )
    if rt_record:
        rt_record.is_revoked = True
        rt_record.revoked_at = datetime.now(timezone.utc)
        db.commit()


# Get current user info

def get_user_profile(user: User) -> dict:
    """Build the /auth/me response dict from a User ORM object."""
    return {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "profile_picture_url": user.profile_picture_url,
        "flat_number": user.flat_number,
        "building_block": user.building_block,
        "staff_type": user.staff_type,
        "emergency_contact": user.emergency_contact,
        "is_active": user.is_active,
        "is_phone_verified": user.is_phone_verified,
        "roles": _get_user_role_names(user),
        "created_at": user.created_at.isoformat(),
    }
