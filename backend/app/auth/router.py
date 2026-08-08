"""
auth/router.py — All /auth/* API endpoints.
"""

import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth import schemas, service
from app.auth.google_oauth import (
    exchange_code_for_tokens,
    get_google_authorization_url,
    get_google_user_info,
)
from app.auth.jwt_handler import create_pending_profile_token, decode_token
from app.config import settings
from app.core.security import limiter
from app.db.database import get_db
from app.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter()

logger = logging.getLogger(__name__)

_REFRESH_COOKIE = "ss_refresh_token"
_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # seconds


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/auth",  # only sent to /auth/* routes
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_REFRESH_COOKIE, path="/auth")


# Signup

@router.post("/signup", response_model=schemas.SignupResponse, status_code=201)
@router.post(
    "/register",
    response_model=schemas.SignupResponse,
    status_code=201,
    include_in_schema=False,
)
def signup(
    data: schemas.SignupRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user. Default role is **flat_owner** (resident member).
    An admin can later elevate the role.
    """
    user = service.signup_user(db, data)
    return schemas.SignupResponse(
        message="Account created. You can now log in.",
        user_id=user.user_id,
        phone_number=user.phone_number,
    )


# Password login

@router.post("/login/password", response_model=schemas.TokenResponse)
@router.post("/login", response_model=schemas.TokenResponse, include_in_schema=False)
def login_password(
    data: schemas.PasswordLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate with email + password. Issues access + refresh tokens."""
    access_token, refresh_token = service.login_with_password(
        db, str(data.email), data.password, request
    )
    _set_refresh_cookie(response, refresh_token)
    return schemas.TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# OTP request

@router.post("/otp/request", status_code=200)
@limiter.limit("3/10 minutes")
def request_otp(
    request: Request,  # required by slowapi
    data: schemas.OTPRequestSchema,
    db: Session = Depends(get_db),
):
    """
    Send a 6-digit OTP to the given phone number.
    Rate-limited to 3 requests per 10 minutes per IP.
    """
    service.request_otp_for_login(db, data.phone_number)
    return {"message": "OTP sent successfully. Valid for 10 minutes."}


# OTP verify

@router.post("/otp/verify", response_model=schemas.TokenResponse)
def verify_otp(
    data: schemas.OTPVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Verify OTP and issue access + refresh tokens on success."""
    access_token, refresh_token = service.verify_otp_login(
        db, data.phone_number, data.otp_code, request
    )
    _set_refresh_cookie(response, refresh_token)
    return schemas.TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# Token refresh

@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Silently refresh the access token using the HttpOnly refresh-token cookie.
    Implements token rotation — old refresh token is revoked.
    """
    refresh_token_value = request.cookies.get(_REFRESH_COOKIE)
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token found.",
        )

    access_token, new_refresh = service.refresh_access_token(
        db, refresh_token_value, request
    )
    _set_refresh_cookie(response, new_refresh)
    return schemas.TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# Logout

@router.post("/logout", status_code=200)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Revoke refresh token and clear auth cookies."""
    refresh_token_value = request.cookies.get(_REFRESH_COOKIE)
    service.logout_user(db, refresh_token_value or "")
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully."}


# Get current user

@router.get("/me", response_model=schemas.UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile and roles."""
    profile = service.get_user_profile(current_user)
    return schemas.UserMeResponse(**profile)


# Google OAuth

@router.get("/google", include_in_schema=True)
def google_login():
    """
    Initiate Google OAuth flow.
    Redirects the browser to Google's consent/login page.
    """
    url, _state = get_google_authorization_url()
    return RedirectResponse(url=url, status_code=302)


@router.get("/google/callback", include_in_schema=True)
def google_callback(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    code: str = None,
    error: str = None,
    state: str = None,
):
    """
    Handle the OAuth callback from Google.

    - Exchanges the authorization code for tokens.
    - Looks up or creates the application user.
    - For new users (profile incomplete): redirects to /complete-profile with
      a short-lived pending token.
    - For returning users (profile complete): issues full tokens and redirects
      to the frontend success page.
    """
    frontend = settings.FRONTEND_URL

    # User cancelled or error from Google
    if error or not code:
        params = urlencode({"error": error or "oauth_cancelled"})
        return RedirectResponse(url=f"{frontend}/signin?{params}", status_code=302)

    try:
        google_tokens = exchange_code_for_tokens(code)
        google_profile = get_google_user_info(google_tokens["access_token"])
    except Exception:
        params = urlencode({"error": "google_auth_failed"})
        return RedirectResponse(url=f"{frontend}/signin?{params}", status_code=302)

    try:
        user, is_profile_complete = service.handle_google_oauth(db, google_profile)
    except Exception:
        logger.exception("handle_google_oauth failed for profile: %s", google_profile.get("email"))
        params = urlencode({"error": "account_error"})
        return RedirectResponse(url=f"{frontend}/signin?{params}", status_code=302)

    if not is_profile_complete:
        # Issue a short-lived pending token — NOT a full session
        pending_token = create_pending_profile_token(user.user_id)
        params = urlencode({
            "token": pending_token,
            "first_name": google_profile.get("given_name", ""),
            "last_name": google_profile.get("family_name", ""),
            "email": google_profile.get("email", ""),
            "picture": google_profile.get("picture", ""),
        })
        return RedirectResponse(
            url=f"{frontend}/complete-profile?{params}", status_code=302
        )

    # Profile complete — issue full access + refresh tokens
    try:
        access_token, refresh_token_value = service._build_token_pair(db, user, request)
    except Exception:
        params = urlencode({"error": "token_error"})
        return RedirectResponse(url=f"{frontend}/signin?{params}", status_code=302)

    # Set the refresh token cookie on the redirect response
    redirect_url = f"{frontend}/auth/google/success?token={access_token}"
    redirect_response = RedirectResponse(url=redirect_url, status_code=302)
    redirect_response.set_cookie(
        key=_REFRESH_COOKIE,
        value=refresh_token_value,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/auth",
    )
    return redirect_response


@router.post("/complete-profile", response_model=schemas.TokenResponse)
def complete_profile(
    data: schemas.CompleteProfileRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Complete the Google OAuth user's profile.

    Requires a short-lived pending_profile Bearer token (issued at callback).
    On success, issues a full access + refresh token pair.
    """
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
    from fastapi import Header

    # Extract the Bearer token from the Authorization header manually
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pending profile token required.",
        )
    pending_token = auth_header.removeprefix("Bearer ").strip()

    # Decode and validate the pending_profile token
    payload = decode_token(pending_token)
    if not payload or payload.get("type") != "pending_profile":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired profile completion token.",
        )

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid profile completion token.",
        )

    user = db.query(User).filter(
        User.user_id == user_id, User.is_active.is_(True)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    access_token, refresh_token_value = service.complete_google_profile(
        db, user, data, request
    )
    _set_refresh_cookie(response, refresh_token_value)
    return schemas.TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
