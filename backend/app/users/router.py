from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import schemas as auth_schemas
from app.auth.service import get_user_profile
from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import require_roles
from app.users import schemas, service

router = APIRouter()


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
