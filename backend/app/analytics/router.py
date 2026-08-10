from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.dependencies import require_roles
from app.db.models.user import User
from app.analytics.schemas import AdminAnalyticsResponse, ResidentAnalyticsResponse, AdvancedAnalyticsResponse, StaffAnalyticsResponse
from app.analytics.service import get_admin_analytics, get_resident_analytics, get_advanced_analytics, export_analytics_csv, get_staff_analytics

router = APIRouter()

@router.get("/staff", response_model=StaffAnalyticsResponse)
def read_staff_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("support_staff", "super_admin", "admin", "committee_member")
    ),
):
    """
    Retrieve aggregated analytics for the Staff Dashboard.
    Requires staff or admin roles.
    """
    return get_staff_analytics(db)

@router.get("/admin", response_model=AdminAnalyticsResponse)
def read_admin_analytics(
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "admin", "committee_member")),
):
    """
    Retrieve aggregated analytics for the Admin Dashboard.
    Requires 'Residential Admin' or 'Super Admin' role.
    """
    return get_admin_analytics(db, months)

@router.get("/resident", response_model=ResidentAnalyticsResponse)
def read_resident_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("flat_owner", "resident_rental")),
):
    """
    Retrieve personalized analytics for the Resident Dashboard.
    Available to any active authenticated user (primarily residents).
    """
    return get_resident_analytics(db, current_user.user_id)

@router.get("/advanced", response_model=AdvancedAnalyticsResponse)
def read_advanced_analytics(
    amenity_id: int | None = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "admin", "committee_member")),
):
    """
    Get advanced analytics for the Admin dashboard (Pareto, Vendor, Financials)
    """
    return get_advanced_analytics(db, amenity_id)

@router.get("/export")
def read_export_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "admin", "committee_member")),
):
    """
    Export analytics as CSV
    """
    csv_content = export_analytics_csv(db)
    return Response(
        content=csv_content, 
        media_type="text/csv", 
        headers={"Content-Disposition": 'attachment; filename="analytics_export.csv"'}
    )
