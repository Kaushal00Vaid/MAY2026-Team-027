from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy import func, or_
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


def list_users_page(
    db: Session,
    page: int,
    page_size: int,
    search: str | None = None,
    role_name: RoleName | None = None,
) -> tuple[list[User], int, dict[str, int]]:
    query = db.query(User).options(joinedload(User.roles).joinedload(UserRole.role))
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                func.concat(User.first_name, " ", User.last_name).ilike(pattern),
                User.email.ilike(pattern),
                User.phone_number.ilike(pattern),
                User.flat_number.ilike(pattern),
                User.building_block.ilike(pattern),
            )
        )
    if role_name is not None:
        query = query.filter(
            User.roles.any(UserRole.role.has(Role.role_name == role_name))
        )
    total = query.with_entities(func.count(func.distinct(User.user_id))).scalar() or 0
    users = (
        query.order_by(User.created_at.desc(), User.user_id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    role_counts = {
        role.value: count
        for role, count in db.query(Role.role_name, func.count(func.distinct(UserRole.user_id)))
        .join(UserRole, UserRole.role_id == Role.role_id)
        .group_by(Role.role_name)
        .all()
    }
    return users, total, role_counts


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

    if RoleName.super_admin in target_roles and role_name != RoleName.super_admin:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The system administrator role cannot be removed or replaced.",
        )

    if not target_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inactive users cannot receive role changes.",
        )

    if role_name in {RoleName.flat_owner, RoleName.resident_rental} and not (
        target_user.flat_number or ""
    ).strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="A flat number is required before assigning a resident role.",
        )

    if role_name == RoleName.support_staff and not (
        target_user.staff_type or ""
    ).strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="A staff designation is required before assigning support staff.",
        )

    if target_roles == {role_name}:
        return target_user

    if role_name == RoleName.super_admin and RoleName.super_admin not in target_roles:
        existing_admin = (
            db.query(UserRole)
            .join(Role, UserRole.role_id == Role.role_id)
            .filter(Role.role_name == RoleName.super_admin)
            .first()
        )
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Exactly one system administrator is allowed.",
            )

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
    if role_name != RoleName.support_staff:
        target_user.staff_type = None
    db.commit()

    updated_user = _get_user_with_roles(db, target_user.user_id)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return updated_user
