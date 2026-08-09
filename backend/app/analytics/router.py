from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.dependencies import get_current_active_user, get_current_user_with_roles
from app.db.models.user import User
from app.analytics.schemas import AdminAnalyticsResponse, ResidentAnalyticsResponse, AdvancedAnalyticsResponse
from app.analytics.service import get_admin_analytics, get_resident_analytics, get_advanced_analytics, export_analytics_csv

router = APIRouter()

@router.get("/admin", response_model=AdminAnalyticsResponse)
def read_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_roles(["Residential Admin", "Super Admin"])),
):
    """
    Retrieve aggregated analytics for the Admin Dashboard.
    Requires 'Residential Admin' or 'Super Admin' role.
    """
    return get_admin_analytics(db)

@router.get("/resident", response_model=ResidentAnalyticsResponse)
def read_resident_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve personalized analytics for the Resident Dashboard.
    Available to any active authenticated user (primarily residents).
    """
    return get_resident_analytics(db, current_user.user_id)

@router.get("/advanced", response_model=AdvancedAnalyticsResponse)
def read_advanced_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_roles(["Residential Admin", "Super Admin"])),
):
    """
    Get advanced analytics for the Admin dashboard (Pareto, Vendor, Financials)
    """
    return get_advanced_analytics(db)

@router.get("/export")
def read_export_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_roles(["Residential Admin", "Super Admin"])),
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
