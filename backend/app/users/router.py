from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import schemas as auth_schemas
from app.auth.service import get_user_profile
from app.db.database import get_db
from app.db.models.role import RoleName
from app.db.models.user import User
from app.dependencies import get_current_user, require_roles
from app.users import schemas, service

router = APIRouter()


@router.get("/me", response_model=auth_schemas.UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Canonical endpoint; /auth/me remains for frontend compatibility."""
    return auth_schemas.UserMeResponse(**get_user_profile(current_user))


@router.get("/", response_model=list[auth_schemas.UserMeResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles("super_admin")),
    db: Session = Depends(get_db),
):
    """List all registered users. Super admin only."""
    users = service.list_all_users(db, skip=skip, limit=limit)
    return [auth_schemas.UserMeResponse(**get_user_profile(u)) for u in users]


@router.get("/manage", response_model=schemas.PaginatedUsersResponse)
def manage_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    role: RoleName | None = None,
    current_user: User = Depends(require_roles("super_admin")),
    db: Session = Depends(get_db),
):
    users, total, role_counts = service.list_users_page(
        db, page, page_size, search, role
    )
    return {
        "items": [
            auth_schemas.UserMeResponse(**get_user_profile(user)) for user in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "role_counts": role_counts,
    }


@router.patch("/{user_id}/role", response_model=auth_schemas.UserMeResponse)
def patch_user_role(
    user_id: int,
    data: schemas.UpdateUserRoleRequest,
    current_user: User = Depends(require_roles("super_admin")),
    db: Session = Depends(get_db),
):
    updated_user = service.update_user_role(
        db=db,
        current_user=current_user,
        target_user_id=user_id,
        role_name=data.role_name,
    )
    return auth_schemas.UserMeResponse(**get_user_profile(updated_user))
