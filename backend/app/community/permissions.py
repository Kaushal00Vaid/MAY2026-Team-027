from fastapi import HTTPException

from app.db.models.role import RoleName
from app.db.models.user import User


OPERATIONAL = {
    RoleName.super_admin.value,
    RoleName.admin.value,
    RoleName.committee_member.value,
}
RESIDENT = {RoleName.flat_owner.value, RoleName.resident_rental.value}


def roles(user: User) -> set[str]:
    return {assignment.role.role_name.value for assignment in user.roles}


def is_operational(user: User) -> bool:
    return bool(roles(user) & OPERATIONAL)


def ensure_operational(user: User) -> None:
    if not is_operational(user):
        raise HTTPException(status_code=403, detail="Admin or committee access required.")


def ensure_community_member(user: User) -> None:
    if not roles(user) & (OPERATIONAL | RESIDENT):
        raise HTTPException(status_code=403, detail="Community access is restricted to residents and committee members.")
