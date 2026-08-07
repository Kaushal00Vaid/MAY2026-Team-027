from fastapi import HTTPException

from app.db.models.role import RoleName


def role_names(user) -> set[str]:
    return {assignment.role.role_name.value for assignment in user.roles}


def is_operational(user) -> bool:
    return bool(
        role_names(user)
        & {
            RoleName.super_admin.value,
            RoleName.admin.value,
            RoleName.committee_member.value,
        }
    )


def is_resident(user) -> bool:
    return bool(
        role_names(user) & {RoleName.flat_owner.value, RoleName.resident_rental.value}
    )


def is_security(user) -> bool:
    return (
        RoleName.support_staff.value in role_names(user)
        and (user.staff_type or "").lower() == "security"
    )


def ensure_gate(user) -> None:
    if not (is_security(user) or is_operational(user)):
        raise HTTPException(status_code=403, detail="Security gate access required.")


def ensure_resident(user) -> None:
    if not is_resident(user):
        raise HTTPException(status_code=403, detail="Resident access required.")


def ensure_operational(user) -> None:
    if not is_operational(user):
        raise HTTPException(
            status_code=403, detail="Admin or committee access required."
        )
