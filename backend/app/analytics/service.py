import csv
from collections import defaultdict
from io import StringIO

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, func, or_
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from app.analytics.schemas import (
    AdminAnalyticsResponse,
    AdminDashboardStats,
    CurrentCollections,
    ActiveComplaints,
    VisitorsAtGate,
    ClubhouseOccupancy,
    SlaAlert,
    RevenueTrendData,
    ActivityFeedItem,
    ResidentAnalyticsResponse,
    ResidentBalance,
    ResidentTicket,
    ResidentBooking,
    ResidentEvent,
    ResidentNotice,
    AdvancedAnalyticsResponse,
    ParetoData,
    VendorData,
    FinancialEfficiency,
    HeatmapDay,
    HeatmapSlot,
    AmenityAnalyticsOption,
    StaffAnalyticsResponse,
    GateActivityAnalytics,
    EventParticipationAnalytics,
    InventoryStatusAnalytics,
    RosterCoverageAnalytics
)
from app.finance.models import Payment, Invoice, Expense
from app.db.models.complaint import Complaint
from app.helpdesk.complaints.models import ComplaintStatusHistory
from app.db.models.user import User
from app.security.models import Visitor, AccessLog
from app.amenities.models import AmenityBooking, Amenity
from app.community.models import CommunityEvent, Notice, EventRsvp
from app.helpdesk.work_orders.models import MaintenanceWorkOrder
from app.operations.models import InventoryItem, ShiftAssignment, StaffAttendance

IST = ZoneInfo("Asia/Kolkata")

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

def _shift_month(month_start: datetime, offset: int) -> datetime:
    month_index = month_start.year * 12 + month_start.month - 1 + offset
    return month_start.replace(year=month_index // 12, month=month_index % 12 + 1)


def _daily_slots(amenity: Amenity, day) -> int:
    operating_minutes = int(
        (
            datetime.combine(day, amenity.operating_end)
            - datetime.combine(day, amenity.operating_start)
        ).total_seconds()
        // 60
    )
    return max(operating_minutes // amenity.slot_minutes, 0)


def _format_inr_compact(amount_paise: int) -> str:
    amount = amount_paise / 100
    if amount >= 10_000_000:
        return f"₹{amount / 10_000_000:.1f}Cr"
    if amount >= 100_000:
        return f"₹{amount / 100_000:.1f}L"
    if amount >= 1_000:
        return f"₹{amount / 1_000:.1f}K"
    return f"₹{amount:,.0f}"


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _local_day_window(now: datetime, local_timezone=IST):
    local_now = _as_utc(now).astimezone(local_timezone)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        local_start.astimezone(timezone.utc),
        (local_start + timedelta(days=1)).astimezone(timezone.utc),
        local_now.date(),
    )


def _heatmap_slots(amenity: Amenity, bookings: list[AmenityBooking], week_start):
    slot_count = 7
    operating_minutes = max(
        int(
            (
                datetime.combine(week_start, amenity.operating_end)
                - datetime.combine(week_start, amenity.operating_start)
            ).total_seconds()
            // 60
        ),
        1,
    )
    bucket_minutes = operating_minutes / slot_count
    counts = [[0 for _ in range(slot_count)] for _ in range(7)]
    for booking in bookings:
        local_start = _as_utc(booking.starts_at).astimezone(IST)
        day_index = (local_start.date() - week_start).days
        if not 0 <= day_index < 7:
            continue
        booking_minutes = (
            local_start.hour * 60
            + local_start.minute
            - amenity.operating_start.hour * 60
            - amenity.operating_start.minute
        )
        bucket = min(max(int(booking_minutes // bucket_minutes), 0), slot_count - 1)
        counts[day_index][bucket] += 1

    peak = max((count for day in counts for count in day), default=0)
    result = []
    for day_index, day_counts in enumerate(counts):
        day = week_start + timedelta(days=day_index)
        slots = []
        for bucket, count in enumerate(day_counts):
            start_minutes = (
                amenity.operating_start.hour * 60
                + amenity.operating_start.minute
                + round(bucket * bucket_minutes)
            )
            hour, minute = divmod(start_minutes, 60)
            intensity = 0 if not count or not peak else max(1, round(count / peak * 4))
            slots.append(HeatmapSlot(
                value=intensity,
                bookings=count,
                label=f"{hour % 24:02d}:{minute:02d}",
            ))
        result.append(HeatmapDay(
            day=day.strftime("%a"),
            date=day.isoformat(),
            slots=slots,
        ))
    return result


def get_admin_analytics(db: Session, months: int = 6) -> AdminAnalyticsResponse:
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
    
    curr_amount = curr_month_total / 100
    prev_amount = prev_month_total / 100
    
    pct_change = 0.0
    if prev_amount > 0:
        pct_change = ((curr_amount - prev_amount) / prev_amount) * 100

    # 2. Active Complaints
    active_complaints_query = db.query(Complaint).filter(Complaint.status.not_in(['Resolved', 'Closed']))
    total_active = active_complaints_query.count()
    high_priority_active = active_complaints_query.filter(Complaint.priority == 'High').count()

    # 3. Visitors at Gate
    total_visitors = db.query(Visitor).filter(Visitor.status == 'pending').count()
    visitors = VisitorsAtGate(total=total_visitors, awaiting_approval=total_visitors)

    # 4. Today's amenity slot utilization. Booking counts and person capacity
    # are different units, so utilization is calculated against configured slots.
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = start_of_today + timedelta(days=1)
    
    active_amenities = db.query(Amenity).filter(Amenity.is_active).all()
    total_slots = sum(_daily_slots(amenity, start_of_today.date()) for amenity in active_amenities)
    amenity_ids = [amenity.id for amenity in active_amenities]
    booked_slots = db.query(AmenityBooking).filter(
        AmenityBooking.amenity_id.in_(amenity_ids),
        AmenityBooking.status.in_(['confirmed', 'completed']),
        AmenityBooking.starts_at >= start_of_today,
        AmenityBooking.starts_at < end_of_today
    ).count() if amenity_ids else 0
    percentage = (booked_slots / total_slots) * 100 if total_slots > 0 else 0

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

    # 6. Revenue trend using exact calendar-month boundaries.
    revenue_trend = []
    for offset in range(-(months - 1), 1):
        m_start = _shift_month(start_of_month, offset)
        m_end = _shift_month(m_start, 1)
        month_total = db.query(func.sum(Payment.amount_paise)).filter(
            Payment.status == 'succeeded',
            Payment.created_at >= m_start,
            Payment.created_at < m_end
        ).scalar() or 0
        
        revenue_trend.append(RevenueTrendData(
            name=m_start.strftime("%b %y") if months > 6 else m_start.strftime("%b"),
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
    # Return the complete bounded feed assembled above. The dashboard initially
    # renders four entries and expands this list in place without another slow
    # network request or an unrelated redirect to Analytics.
    top_feed = [x["item"] for x in feed_items]

    return AdminAnalyticsResponse(
        stats=AdminDashboardStats(
            current_collections=CurrentCollections(
                amount=curr_amount,
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
                capacity=total_slots
            )
        ),
        sla_alerts=sla_alerts,
        revenue_trend=revenue_trend,
        activity_feed=top_feed
    )

def get_resident_analytics(db: Session, user: User) -> ResidentAnalyticsResponse:
    now = datetime.now(timezone.utc)
    user_id = user.user_id
    
    # 1. Balance
    invoices = db.query(Invoice).filter(
        Invoice.resident_id == user_id,
        Invoice.status.in_(['issued', 'overdue'])
    ).all()
    
    total_due = sum((inv.base_amount_paise + inv.late_fee_paise) for inv in invoices) / 100.0
    next_due_date = None
    latest_invoice_number = None
    if invoices:
        next_invoice = min(invoices, key=lambda x: x.due_date)
        next_due_date = next_invoice.due_date.strftime("%d %b")
        latest_invoice_number = next_invoice.invoice_number
        
    balance = ResidentBalance(
        total_due=total_due,
        next_due_date=next_due_date,
        latest_invoice_number=latest_invoice_number
    )
    
    # 2. Tickets
    recent_complaints = db.query(Complaint).filter(Complaint.user_id == user_id).order_by(Complaint.updated_at.desc()).limit(5).all()
    tickets = []
    for c in recent_complaints:
        color = "gray"
        if c.status not in ["Resolved", "Closed"]:
            color = "orange" if c.priority == "High" else "blue"
        tickets.append(ResidentTicket(
            id=f"TKT-{c.id}",
            title=c.title or "Complaint",
            status=c.status,
            type=c.category,
            updated=time_ago_str(c.updated_at),
            color=color
        ))
        
    # 3. Bookings
    upcoming_bookings = db.query(AmenityBooking).filter(
        AmenityBooking.resident_id == user_id,
        AmenityBooking.ends_at > now,
        AmenityBooking.status == 'confirmed'
    ).order_by(AmenityBooking.starts_at.asc()).limit(3).all()
    
    bookings = []
    for b in upcoming_bookings:
        # Avoid making separate queries if Amenity is loaded, but it might not be eager loaded. 
        # We can just fetch it manually if needed, or assume it's backpopulated (needs a join ideally).
        amenity = db.query(Amenity).filter(Amenity.id == b.amenity_id).first()
        amenity_name = amenity.name if amenity else "Amenity"
        local_start = _as_utc(b.starts_at).astimezone(IST)
        local_end = _as_utc(b.ends_at).astimezone(IST)
        is_today = local_start.date() == now.astimezone(IST).date()
        bookings.append(ResidentBooking(
            id=b.id,
            title=b.purpose or amenity_name,
            amenity_name=amenity_name,
            starts_at=local_start.strftime("%H:%M"),
            ends_at=local_end.strftime("%H:%M"),
            is_today=is_today
        ))
        
    # 4. Events
    upcoming_events = db.query(CommunityEvent).filter(
        CommunityEvent.starts_at >= now,
        CommunityEvent.is_active
    ).order_by(CommunityEvent.starts_at.asc()).limit(3).all()
    
    events = []
    for e in upcoming_events:
        local_start = _as_utc(e.starts_at).astimezone(IST)
        events.append(ResidentEvent(
            id=e.id,
            title=e.title,
            location=e.location,
            date_str=local_start.strftime("%d %b %Y"),
            time_str=local_start.strftime("%H:%M"),
            month=local_start.strftime("%b"),
            day=local_start.strftime("%d")
        ))
        
    # 5. Notices
    active_notices = db.query(Notice, User.first_name, User.last_name).outerjoin(
        User,
        and_(User.user_id == Notice.created_by, User.is_active.is_(True)),
    ).filter(
        Notice.is_active.is_(True),
        or_(Notice.expires_at.is_(None), Notice.expires_at > now),
        or_(
            Notice.target_type == "all",
            and_(
                Notice.target_type == "block",
                func.lower(Notice.target_value) == (user.building_block or "").lower(),
            ),
            and_(
                Notice.target_type == "flat",
                func.lower(Notice.target_value) == (user.flat_number or "").lower(),
            ),
        ),
    ).order_by(Notice.published_at.desc()).limit(5).all()
    
    notices = []
    colors = ["blue", "orange", "emerald", "purple", "gray"]
    for i, (n, author_first_name, author_last_name) in enumerate(active_notices):
        author_name = " ".join(
            part for part in (author_first_name, author_last_name) if part
        ) or "Management"
        notices.append(ResidentNotice(
            id=n.id,
            title=n.title,
            desc=n.body[:150] + ("..." if len(n.body) > 150 else ""),
            from_author=author_name,
            time_str=time_ago_str(n.published_at),
            color=colors[i % len(colors)]
        ))
        
    return ResidentAnalyticsResponse(
        balance=balance,
        tickets=tickets,
        bookings=bookings,
        events=events,
        notices=notices
    )

def get_advanced_analytics(db: Session, amenity_id: int | None = None) -> AdvancedAnalyticsResponse:
    # 1. Pareto Data
    complaints = db.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
    pareto = []
    for category, count in complaints:
        name = category if category else "Other"
        pareto.append(ParetoData(name=name, value=count))
    pareto.sort(key=lambda x: x.value, reverse=True)
    # 2. Vendors Data
    vendors = []
    staff_users = db.query(User).filter(
        User.staff_type.isnot(None), User.is_active.is_(True)
    ).order_by(User.first_name, User.last_name).all()
    tasks_by_staff = defaultdict(list)
    if staff_users:
        work_orders = db.query(MaintenanceWorkOrder).options(
            selectinload(MaintenanceWorkOrder.complaint)
        ).filter(
            MaintenanceWorkOrder.assigned_to.in_([staff.user_id for staff in staff_users])
        ).all()
        for work_order in work_orders:
            tasks_by_staff[work_order.assigned_to].append(work_order)
    now = datetime.now(timezone.utc)
    for staff in staff_users:
        tasks = tasks_by_staff[staff.user_id]
        completed_tasks = [t for t in tasks if t.resolved_at]
        res = "0.0"
        sla = "Within SLA"
        if completed_tasks:
            average_hours = sum(
                (_as_utc(task.resolved_at) - _as_utc(task.created_at)).total_seconds() / 3600
                for task in completed_tasks
            ) / len(completed_tasks)
            res = f"{average_hours:.1f}"
        overdue_tasks = [
            task for task in tasks
            if task.complaint and task.complaint.sla_deadline
            and not task.resolved_at and _as_utc(task.complaint.sla_deadline) < now
        ]
        if len(overdue_tasks) >= 2:
            sla = "Escalated"
        elif overdue_tasks:
            sla = "Warning (L1)"
            
        vendors.append(VendorData(
            id=staff.user_id,
            name=f"{staff.first_name} {staff.last_name}",
            type=staff.staff_type or "General",
            res=res,
            sla=sla
        ))
        
    # 3. Financial Efficiency
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    collections = db.query(func.sum(Payment.amount_paise)).filter(Payment.status == 'succeeded', Payment.created_at >= start_of_month).scalar() or 0
    opex = db.query(func.sum(Expense.amount_paise)).filter(Expense.expense_date >= start_of_month.date()).scalar() or 0
    
    col_str = _format_inr_compact(collections)
    opex_str = _format_inr_compact(opex)
    ratio = round(collections / (collections + opex) * 100) if collections + opex else 0
        
    financial = FinancialEfficiency(ratio=ratio, collections=col_str, opex=opex_str)
    
    # 4. Current-week heatmap for the selected active amenity.
    active_amenities = db.query(Amenity).filter(Amenity.is_active).order_by(Amenity.name).all()
    selected_amenity = next((item for item in active_amenities if item.id == amenity_id), None)
    if amenity_id is not None and selected_amenity is None:
        raise HTTPException(status_code=404, detail="Active amenity not found.")
    if selected_amenity is None and active_amenities:
        selected_amenity = active_amenities[0]
    local_now = now.astimezone(IST)
    week_start = (local_now - timedelta(days=local_now.weekday())).date()
    heatmap = []
    if selected_amenity:
        week_end = week_start + timedelta(days=7)
        bookings = db.query(AmenityBooking).filter(
            AmenityBooking.amenity_id == selected_amenity.id,
            AmenityBooking.status.in_(["confirmed", "completed"]),
            AmenityBooking.starts_at >= datetime.combine(
                week_start, datetime.min.time(), tzinfo=IST
            ).astimezone(timezone.utc),
            AmenityBooking.starts_at < datetime.combine(
                week_end, datetime.min.time(), tzinfo=IST
            ).astimezone(timezone.utc),
        ).all()
        heatmap = _heatmap_slots(selected_amenity, bookings, week_start)
        
    return AdvancedAnalyticsResponse(
        pareto=pareto,
        vendors=vendors,
        financial=financial,
        heatmap=heatmap,
        amenities=[AmenityAnalyticsOption(id=item.id, name=item.name) for item in active_amenities],
        selected_amenity_id=selected_amenity.id if selected_amenity else None,
    )
    
def export_analytics_csv(db: Session, amenity_id: int | None = None) -> str:
    analytics = get_advanced_analytics(db, amenity_id)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["REPORT: Advanced Analytics"])
    writer.writerow([])

    writer.writerow(["Complaint Pareto"])
    writer.writerow(["Category", "Count"])
    for item in analytics.pareto:
        writer.writerow([item.name, item.value])
    writer.writerow([])

    writer.writerow(["Service Provider Performance"])
    writer.writerow(["Name", "Service Type", "Average Resolution Hours", "SLA Status"])
    for provider in analytics.vendors:
        writer.writerow([provider.name, provider.type, provider.res, provider.sla])
    writer.writerow([])

    writer.writerow(["Financial Efficiency"])
    writer.writerow(["Collection Ratio", "Collections", "Operating Expenses"])
    writer.writerow([
        f"{analytics.financial.ratio}%",
        analytics.financial.collections,
        analytics.financial.opex,
    ])
    writer.writerow([])

    selected = next(
        (item for item in analytics.amenities if item.id == analytics.selected_amenity_id),
        None,
    )
    writer.writerow(["Amenity Utilization", selected.name if selected else "No active amenity"])
    writer.writerow(["Date", "Day", "Time", "Bookings", "Intensity"])
    for day in analytics.heatmap:
        for slot in day.slots:
            writer.writerow([day.date, day.day, slot.label, slot.bookings, slot.value])

    return output.getvalue()

def get_staff_analytics(db: Session) -> StaffAnalyticsResponse:
    now = datetime.now(timezone.utc)
    start_of_today, end_of_today, today_date = _local_day_window(now)
    
    # 1. Gate Activity
    total_entries_today = db.query(AccessLog).filter(
        AccessLog.occurred_at >= start_of_today,
        AccessLog.occurred_at < end_of_today,
    ).count()
    pending_approvals = db.query(Visitor).filter(Visitor.status == 'pending').count()
    gate_activity = GateActivityAnalytics(
        total_entries_today=total_entries_today,
        pending_approvals=pending_approvals
    )
    
    # 2. Event Participation (Top 3 upcoming)
    upcoming_events = db.query(CommunityEvent).filter(
        CommunityEvent.starts_at > now,
        CommunityEvent.is_active
    ).order_by(CommunityEvent.starts_at.asc()).limit(3).all()
    
    events_data = []
    for e in upcoming_events:
        rsvp_count = db.query(EventRsvp).filter(
            EventRsvp.event_id == e.id,
            EventRsvp.status == 'going'
        ).count()
        events_data.append(EventParticipationAnalytics(
            id=e.id,
            title=e.title,
            rsvp_count=rsvp_count,
            starts_at=e.starts_at.isoformat()
        ))
        
    # 3. Inventory Status
    total_items = db.query(InventoryItem).filter(InventoryItem.is_active).count()
    low_stock_items = db.query(InventoryItem).filter(
        InventoryItem.is_active,
        InventoryItem.quantity <= InventoryItem.reorder_threshold
    ).count()
    inventory = InventoryStatusAnalytics(
        low_stock_items=low_stock_items,
        total_items=total_items
    )
    
    # 4. Roster Coverage
    # Mask logic: 1 << today.weekday()
    day_mask_bit = 1 << today_date.weekday()
    
    active_staff_today = db.query(
        func.count(func.distinct(ShiftAssignment.staff_id))
    ).filter(
        ShiftAssignment.status == 'active',
        ShiftAssignment.days_mask.op('&')(day_mask_bit) > 0
    ).scalar() or 0
    
    checked_in_now = db.query(
        func.count(func.distinct(StaffAttendance.staff_id))
    ).join(
        ShiftAssignment,
        ShiftAssignment.staff_id == StaffAttendance.staff_id,
    ).filter(
        StaffAttendance.attendance_date == today_date,
        StaffAttendance.check_in_at.isnot(None),
        StaffAttendance.check_out_at.is_(None),
        ShiftAssignment.status == 'active',
        ShiftAssignment.days_mask.op('&')(day_mask_bit) > 0,
    ).scalar() or 0
    
    roster = RosterCoverageAnalytics(
        active_staff_today=active_staff_today,
        checked_in_now=checked_in_now
    )
    
    return StaffAnalyticsResponse(
        gate_activity=gate_activity,
        events=events_data,
        inventory=inventory,
        roster=roster
    )
