"""
auth/router.py — All /auth/* API endpoints.
"""

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.auth import schemas, service
from app.config import settings
from app.core.security import limiter
from app.db.database import get_db
from app.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter()

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
        from fastapi import HTTPException, status
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
