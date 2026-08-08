"""
auth/google_oauth.py — Google OAuth 2.0 helper functions.

Handles the OAuth authorization URL generation, code exchange, and
fetching the user profile from Google's userinfo endpoint.
Uses httpx (already in requirements) for HTTP requests.
"""

import secrets
from urllib.parse import urlencode

import httpx

from app.config import settings

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

_SCOPES = "openid email profile"


def get_google_authorization_url() -> tuple[str, str]:
    """
    Build the Google OAuth consent page URL.

    Returns:
        (url, state) — url to redirect the user to, and the state value
        that must be stored (cookie / session) and verified in the callback.
    """
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": _SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    url = f"{_GOOGLE_AUTH_URL}?{urlencode(params)}"
    return url, state


def exchange_code_for_tokens(code: str) -> dict:
    """
    Exchange the authorization code received in the callback for Google tokens.

    Returns the full token response dict, which includes:
      - access_token
      - id_token (JWT containing basic profile claims)
      - token_type
      - expires_in
    """
    payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    with httpx.Client() as client:
        response = client.post(_GOOGLE_TOKEN_URL, data=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()


def get_google_user_info(access_token: str) -> dict:
    """
    Fetch the authenticated user's Google profile using their access token.

    Returns a dict with keys:
      - id          (Google account sub / unique identifier)
      - email
      - verified_email
      - given_name  (first name)
      - family_name (last name)
      - picture     (profile photo URL)
      - name        (full display name)
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client() as client:
        response = client.get(_GOOGLE_USERINFO_URL, headers=headers, timeout=10.0)
        response.raise_for_status()
        return response.json()
