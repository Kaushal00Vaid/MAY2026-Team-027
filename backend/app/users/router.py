from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import schemas as auth_schemas
from app.auth.service import get_user_profile
from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import require_roles
from app.users import schemas, service

router = APIRouter()


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


@router.patch("/{user_id}/role", response_model=auth_schemas.UserMeResponse)
def patch_user_role(
    user_id: int,
    data: schemas.UpdateUserRoleRequest,
    current_user: User = Depends(require_roles("super_admin", "admin")),
    db: Session = Depends(get_db),
):
    updated_user = service.update_user_role(
        db=db,
        current_user=current_user,
        target_user_id=user_id,
        role_name=data.role_name,
    )
    return auth_schemas.UserMeResponse(**get_user_profile(updated_user))
