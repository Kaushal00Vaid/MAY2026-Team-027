from fastapi import HTTPException

from app.db.models.role import RoleName

OPS = {
    RoleName.super_admin.value,
    RoleName.admin.value,
    RoleName.committee_member.value,
}


def roles(user):
    return {item.role.role_name.value for item in user.roles}


def is_operational(user):
    return bool(roles(user) & OPS)


def is_staff(user):
    return RoleName.support_staff.value in roles(user)


def ensure_staff_or_ops(user):
    if not (is_staff(user) or is_operational(user)):
        raise HTTPException(status_code=403, detail="Staff operations access required.")


def ensure_ops(user):
    if not is_operational(user):
        raise HTTPException(
            status_code=403, detail="Operational administration access required."
        )


def ensure_staff(user):
    if not is_staff(user):
        raise HTTPException(
            status_code=403, detail="Personal staff attendance access required."
        )
