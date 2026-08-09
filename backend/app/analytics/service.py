from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timezone, timedelta
from typing import List

from app.analytics.schemas import (
    AdminAnalyticsResponse,
    AdminDashboardStats,
    CurrentCollections,
    ActiveComplaints,
    VisitorsAtGate,
    ClubhouseOccupancy,
    SlaAlert,
    RevenueTrendData,
    ActivityFeedItem
)
from app.finance.models import Payment
from app.db.models.complaint import Complaint, ComplaintStatusHistory
from app.security.models import Visitor, AccessLog
from app.amenities.models import AmenityBooking, Amenity

def time_ago_str(dt: datetime) -> str:
    if not dt:
        return "Unknown"
    now = datetime.now(timezone.utc)
    # Ensure dt is timezone aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    if diff.total_seconds() < 60:
        return "Just Now"
    elif diff.total_seconds() < 3600:
        return f"{int(diff.total_seconds() // 60)} mins ago"
    elif diff.total_seconds() < 86400:
        return f"{int(diff.total_seconds() // 3600)} hours ago"
    else:
        return f"{int(diff.total_seconds() // 86400)} days ago"

def get_admin_analytics(db: Session) -> AdminAnalyticsResponse:
    now = datetime.now(timezone.utc)
    
    # 1. Current Collections
    # Current month
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Previous month
    if start_of_month.month == 1:
        start_of_prev_month = start_of_month.replace(year=start_of_month.year - 1, month=12)
    else:
        start_of_prev_month = start_of_month.replace(month=start_of_month.month - 1)
        
    curr_month_total = db.query(func.sum(Payment.amount_paise)).filter(
        Payment.status == 'succeeded',
        Payment.created_at >= start_of_month
    ).scalar() or 0
    
    prev_month_total = db.query(func.sum(Payment.amount_paise)).filter(
        Payment.status == 'succeeded',
        Payment.created_at >= start_of_prev_month,
        Payment.created_at < start_of_month
    ).scalar() or 0
    
    curr_amount_dollars = curr_month_total / 100
    prev_amount_dollars = prev_month_total / 100
    
    pct_change = 0.0
    if prev_amount_dollars > 0:
        pct_change = ((curr_amount_dollars - prev_amount_dollars) / prev_amount_dollars) * 100

    # 2. Active Complaints
    active_complaints_query = db.query(Complaint).filter(Complaint.status.not_in(['Resolved', 'Closed']))
    total_active = active_complaints_query.count()
    high_priority_active = active_complaints_query.filter(Complaint.priority == 'High').count()

    # 3. Visitors at Gate
    total_visitors = db.query(Visitor).filter(Visitor.status == 'pending').count()
    # To match UI style, total and awaiting_approval might just be the same for the mock
    visitors = VisitorsAtGate(total=total_visitors, awaiting_approval=total_visitors)

    # 4. Amenities (Clubhouse Occupancy for today)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = start_of_today + timedelta(days=1)
    
    total_capacity = db.query(func.sum(Amenity.capacity)).filter(Amenity.is_active == True).scalar() or 100
    booked_slots = db.query(AmenityBooking).filter(
        AmenityBooking.status == 'confirmed',
        AmenityBooking.starts_at >= start_of_today,
        AmenityBooking.starts_at < end_of_today
    ).count()
    
    # Just an approximation: 
    percentage = (booked_slots / total_capacity) * 100 if total_capacity > 0 else 0

    # 5. SLA Alerts
    overdue_complaints = active_complaints_query.filter(
        Complaint.sla_deadline < now
    ).order_by(Complaint.sla_deadline.asc()).limit(5).all()
    
    sla_alerts = []
    for c in overdue_complaints:
        diff_mins = int((now - c.sla_deadline).total_seconds() / 60) if c.sla_deadline else 0
        sla_alerts.append(SlaAlert(
            ticket_id=f"#TK-{c.id}",
            title=c.title or "Complaint",
            overdue_by_mins=max(diff_mins, 0)
        ))

    # 6. Revenue Trend (last 6 months)
    revenue_trend = []
    for i in range(5, -1, -1):
        # Calculate month start and end
        # this logic can be simplified but let's do a reliable backstep
        m_date = now - timedelta(days=30 * i)
        m_start = m_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year + 1, month=1)
        else:
            m_end = m_start.replace(month=m_start.month + 1)
            
        month_total = db.query(func.sum(Payment.amount_paise)).filter(
            Payment.status == 'succeeded',
            Payment.created_at >= m_start,
            Payment.created_at < m_end
        ).scalar() or 0
        
        revenue_trend.append(RevenueTrendData(
            name=m_start.strftime("%b"),
            value=month_total / 100
        ))

    # 7. Activity Feed (Mix of different logs)
    # Fetch recent access logs
    recent_access = db.query(AccessLog).order_by(AccessLog.occurred_at.desc()).limit(3).all()
    # Fetch recent complaints changes
    recent_complaints = db.query(ComplaintStatusHistory).order_by(ComplaintStatusHistory.created_at.desc()).limit(3).all()
    # Fetch recent bookings
    recent_bookings = db.query(AmenityBooking).order_by(AmenityBooking.created_at.desc()).limit(3).all()
    
    feed_items = []
    for a in recent_access:
        feed_items.append({
            "dt": a.occurred_at,
            "item": ActivityFeedItem(
                time_ago=time_ago_str(a.occurred_at),
                type="security",
                title=a.gate or "Main Gate",
                description=f"{a.event_type} for {a.subject_name}"
            )
        })
    for c in recent_complaints:
        comp = c.complaint
        title = "Helpdesk"
        desc = f"Updated ticket #TK-{c.complaint_id} to {c.to_status}."
        if comp and comp.category:
             desc += f" ({comp.category})"
        feed_items.append({
            "dt": c.created_at,
            "item": ActivityFeedItem(
                time_ago=time_ago_str(c.created_at),
                type="helpdesk",
                title=title,
                description=desc
            )
        })
    for b in recent_bookings:
        feed_items.append({
            "dt": b.created_at,
            "item": ActivityFeedItem(
                time_ago=time_ago_str(b.created_at),
                type="amenities",
                title="Amenities",
                description=f"Booking {b.status} for {b.purpose}."
            )
        })
        
    feed_items.sort(key=lambda x: x["dt"], reverse=True)
    top_feed = [x["item"] for x in feed_items[:4]]

    return AdminAnalyticsResponse(
        stats=AdminDashboardStats(
            current_collections=CurrentCollections(
                amount=curr_amount_dollars,
                percentage_change=pct_change
            ),
            active_complaints=ActiveComplaints(
                total=total_active,
                high_priority=high_priority_active
            ),
            visitors_at_gate=visitors,
            clubhouse_occupancy=ClubhouseOccupancy(
                percentage=percentage,
                booked=booked_slots,
                capacity=total_capacity
            )
        ),
        sla_alerts=sla_alerts,
        revenue_trend=revenue_trend,
        activity_feed=top_feed
    )
