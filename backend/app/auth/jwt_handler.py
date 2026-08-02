import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import settings


# ─── Token creation ──────────────────────────────────────────────────────────

import uuid

def create_access_token(user_id: int, roles: list[str]) -> str:
    """Create a short-lived JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "roles": roles,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """Create a long-lived JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ─── Token decoding ───────────────────────────────────────────────────────────

def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload dict or None on failure."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ─── Token hashing (for DB storage) ─────────────────────────────────────────

def hash_token(token: str) -> str:
    """SHA-256 hash a token string for safe DB storage."""
    return hashlib.sha256(token.encode()).hexdigest()
