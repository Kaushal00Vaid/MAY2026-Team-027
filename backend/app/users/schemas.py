from pydantic import BaseModel

from app.db.models.role import RoleName


class UpdateUserRoleRequest(BaseModel):
    role_name: RoleName
