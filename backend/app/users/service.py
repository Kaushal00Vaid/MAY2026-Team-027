from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import PermissionDeniedException
from app.db.models.role import Role, RoleName, UserRole
from app.db.models.user import User


def _get_user_with_roles(db: Session, user_id: int) -> Optional[User]:
    return (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.user_id == user_id)
        .first()
    )


def list_all_users(db: Session, skip: int = 0, limit: int = 50) -> List[User]:
    """Return a paginated list of all users with their roles eager-loaded."""
    return (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_user_role(
    db: Session,
    current_user: User,
    target_user_id: int,
    role_name: RoleName,
) -> User:
    caller_roles = {ur.role.role_name for ur in current_user.roles}
    caller_is_super_admin = RoleName.super_admin in caller_roles

    if role_name == RoleName.super_admin and not caller_is_super_admin:
        raise PermissionDeniedException()

    target_user = _get_user_with_roles(db, target_user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    target_roles = {ur.role.role_name for ur in target_user.roles}
    if RoleName.super_admin in target_roles and not caller_is_super_admin:
        raise PermissionDeniedException()

    role = db.query(Role).filter(Role.role_name == role_name).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role.",
        )

    db.query(UserRole).filter(UserRole.user_id == target_user.user_id).delete(
        synchronize_session=False
    )
    db.add(
        UserRole(
            user_id=target_user.user_id,
            role_id=role.role_id,
            assigned_by=current_user.user_id,
        )
    )
    db.commit()

    updated_user = _get_user_with_roles(db, target_user.user_id)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return updated_user
