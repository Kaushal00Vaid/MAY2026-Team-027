# Import all models here so SQLAlchemy Base.metadata registers them all.
# This is critical for Alembic autogenerate to detect all tables.

from app.db.models.user import User  # noqa: F401
from app.db.models.role import Role, UserRole, RoleName  # noqa: F401
from app.db.models.otp import OTPRecord, OTPPurpose  # noqa: F401
from app.db.models.token import RefreshToken  # noqa: F401
from app.db.models.complaint import Complaint  # noqa: F401
from app.db.models.complaint_comment import ComplaintComment  # noqa: F401
from app.db.models.transaction import Transaction, TransactionType  # noqa: F401

__all__ = [
    "User",
    "Role",
    "UserRole",
    "RoleName",
    "OTPRecord",
    "OTPPurpose",
    "RefreshToken",
    "Complaint",
    "ComplaintComment",
    "Transaction",
    "TransactionType",
]
