from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt_handler import decode_token
from app.core.exceptions import PermissionDeniedException
from app.db.database import get_db
from app.db.models.user import User

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that extracts and validates the Bearer access token,
    returning the corresponding active User.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: int = int(payload["sub"])
    user: Optional[User] = (
        db.query(User)
        .filter(User.user_id == user_id, User.is_active.is_(True))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_roles(*allowed_roles: str):
    """
    Dependency factory for role-based access control.
    Usage:
        @router.delete("/users/{id}")
        def delete_user(user = Depends(require_roles("super_admin", "admin"))):
            ...
    """

    allowed_role_set = set(allowed_roles)

    def _check(current_user: User = Depends(get_current_user)) -> User:
        user_roles = {ur.role.role_name.value for ur in current_user.roles}
        if not user_roles.intersection(allowed_role_set):
            raise PermissionDeniedException()
        return current_user

    return _check
