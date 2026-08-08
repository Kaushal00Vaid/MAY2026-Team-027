# Import all models so SQLAlchemy Base.metadata registers every feature table.
from app.community.models import (  # noqa: F401
    CommunityEvent,
    DiscussionLike,
    DiscussionReply,
    DiscussionThread,
    EventRsvp,
    Notice,
    NoticeDelivery,
    Poll,
    PollOption,
    PollVote,
    VolunteerOpportunity,
    VolunteerSignup,
)
from app.db.models.complaint import Complaint  # noqa: F401
from app.db.models.complaint_comment import ComplaintComment  # noqa: F401
from app.db.models.otp import OTPPurpose, OTPRecord  # noqa: F401
from app.db.models.role import Role, RoleName, UserRole  # noqa: F401
from app.db.models.token import RefreshToken  # noqa: F401
from app.db.models.transaction import Transaction, TransactionType  # noqa: F401
from app.db.models.user import User  # noqa: F401
from app.finance.models import (  # noqa: F401
    BulkInvoiceRun,
    Expense,
    FundAllocation,
    Invoice,
    InvoiceReminder,
    LedgerEntry,
    Payment,
)
from app.amenities.models import Amenity, AmenityBooking  # noqa: F401
from app.operations.models import (  # noqa: F401
    InventoryItem,
    InventoryUnit,
    OperationalTask,
    ShiftAssignment,
    StaffAttendance,
    StockMovement,
    Vendor,
)
from app.helpdesk.complaints.models import ComplaintAttachment, ComplaintStatusHistory  # noqa: F401
from app.helpdesk.work_orders.models import (  # noqa: F401
    KnownIssueSubscription,
    MaintenanceWorkOrder,
    StaffDutyState,
    WorkOrderResolutionPhoto,
)
from app.security.models import AccessLog, GuestPass, Visitor  # noqa: F401

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
    "ComplaintAttachment",
    "ComplaintStatusHistory",
    "KnownIssueSubscription",
    "MaintenanceWorkOrder",
    "StaffDutyState",
    "WorkOrderResolutionPhoto",
    "Transaction",
    "TransactionType",
    "Visitor",
    "GuestPass",
    "AccessLog",
    "Notice",
    "NoticeDelivery",
    "CommunityEvent",
    "EventRsvp",
    "VolunteerOpportunity",
    "VolunteerSignup",
    "Poll",
    "PollOption",
    "PollVote",
    "DiscussionThread",
    "DiscussionReply",
    "DiscussionLike",
    "Invoice",
    "Payment",
    "LedgerEntry",
    "Expense",
    "FundAllocation",
    "BulkInvoiceRun",
    "InvoiceReminder",
    "Amenity",
    "AmenityBooking",
    "OperationalTask",
    "InventoryUnit",
    "Vendor",
    "InventoryItem",
    "StockMovement",
    "ShiftAssignment",
    "StaffAttendance",
]
