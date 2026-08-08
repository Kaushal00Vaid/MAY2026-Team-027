from fastapi import HTTPException

from app.db.models.role import RoleName

OPS = {
    RoleName.super_admin.value,
    RoleName.admin.value,
    RoleName.committee_member.value,
}
RESIDENTS = {RoleName.flat_owner.value, RoleName.resident_rental.value}


def role_names(user) -> set[str]:
    return {assignment.role.role_name.value for assignment in user.roles}


def is_operational(user) -> bool:
    return bool(role_names(user) & OPS)


def is_resident(user) -> bool:
    return bool(role_names(user) & RESIDENTS)


def ensure_member(user) -> None:
    if not (is_operational(user) or is_resident(user)):
        raise HTTPException(status_code=403, detail="Amenity access required.")


def ensure_operational(user) -> None:
    if not is_operational(user):
        raise HTTPException(
            status_code=403, detail="Amenity administration access required."
        )


def ensure_resident(user) -> None:
    if not is_resident(user):
        raise HTTPException(status_code=403, detail="Resident amenity access required.")
