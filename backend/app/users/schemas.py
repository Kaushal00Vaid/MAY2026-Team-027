from pydantic import BaseModel

from app.auth.schemas import UserMeResponse
from app.db.models.role import RoleName


class UpdateUserRoleRequest(BaseModel):
    role_name: RoleName


class PaginatedUsersResponse(BaseModel):
    items: list[UserMeResponse]
    total: int
    page: int
    page_size: int
    role_counts: dict[str, int]
