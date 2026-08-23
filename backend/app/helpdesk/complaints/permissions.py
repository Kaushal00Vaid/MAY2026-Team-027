from fastapi import HTTPException, status

from app.db.models.role import RoleName
from app.db.models.user import User


OPERATIONAL_ROLES = {
    RoleName.super_admin.value,
    RoleName.admin.value,
    RoleName.committee_member.value,
}
RESIDENT_ROLES = {RoleName.flat_owner.value, RoleName.resident_rental.value}


def role_names(user: User) -> set[str]:
    return {assignment.role.role_name.value for assignment in user.roles}


def is_operational(user: User) -> bool:
    return bool(role_names(user) & OPERATIONAL_ROLES)


def can_create_complaint(user: User) -> bool:
    return bool(role_names(user) & (OPERATIONAL_ROLES | RESIDENT_ROLES))


def ensure_can_create(user: User) -> None:
    if not can_create_complaint(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot create complaints.",
        )


def ensure_resident(user: User) -> None:
    if not role_names(user) & RESIDENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resident access required.",
        )


def ensure_operational(user: User) -> None:
    if not is_operational(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or committee roles can manage complaints.",
        )
