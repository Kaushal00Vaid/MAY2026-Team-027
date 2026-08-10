from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.dependencies import require_roles
from app.db.models.user import User
from app.analytics.schemas import AdminAnalyticsResponse
from app.analytics.service import get_admin_analytics

router = APIRouter()

@router.get("/admin", response_model=AdminAnalyticsResponse)
def read_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("super_admin", "admin", "committee_member")
    ),
):
    """
    Retrieve aggregated analytics for the Admin Dashboard.
    Requires 'Residential Admin' or 'Super Admin' role.
    """
    return get_admin_analytics(db)
