from typing import List
from pydantic import BaseModel

class CurrentCollections(BaseModel):
    amount: float
    percentage_change: float

class ActiveComplaints(BaseModel):
    total: int
    high_priority: int

class VisitorsAtGate(BaseModel):
    total: int
    awaiting_approval: int

class ClubhouseOccupancy(BaseModel):
    percentage: float
    booked: int
    capacity: int

class AdminDashboardStats(BaseModel):
    current_collections: CurrentCollections
    active_complaints: ActiveComplaints
    visitors_at_gate: VisitorsAtGate
    clubhouse_occupancy: ClubhouseOccupancy

class SlaAlert(BaseModel):
    ticket_id: str
    title: str
    overdue_by_mins: int

class RevenueTrendData(BaseModel):
    name: str
    value: float

class ActivityFeedItem(BaseModel):
    time_ago: str
    type: str
    title: str
    description: str

class AdminAnalyticsResponse(BaseModel):
    stats: AdminDashboardStats
    sla_alerts: List[SlaAlert]
    revenue_trend: List[RevenueTrendData]
    activity_feed: List[ActivityFeedItem]

class ResidentBalance(BaseModel):
    total_due: float
    next_due_date: str | None = None
    latest_invoice_number: str | None = None

class ResidentTicket(BaseModel):
    id: str
    title: str
    status: str
    type: str
    updated: str
    color: str

class ResidentBooking(BaseModel):
    id: int
    title: str
    amenity_name: str
    starts_at: str
    ends_at: str
    is_today: bool

class ResidentEvent(BaseModel):
    id: int
    title: str
    location: str
    date_str: str
    time_str: str
    month: str
    day: str

class ResidentNotice(BaseModel):
    id: int
    title: str
    desc: str
    from_author: str
    time_str: str
    color: str

class ResidentAnalyticsResponse(BaseModel):
    balance: ResidentBalance
    tickets: List[ResidentTicket]
    bookings: List[ResidentBooking]
    events: List[ResidentEvent]
    notices: List[ResidentNotice]

class ParetoData(BaseModel):
    name: str
    value: int

class VendorData(BaseModel):
    id: int
    name: str
    type: str
    res: str
    sla: str

class FinancialEfficiency(BaseModel):
    ratio: int
    collections: str
    opex: str

class HeatmapSlot(BaseModel):
    value: int # 0 to 4 intensity

class HeatmapDay(BaseModel):
    day: str
    slots: List[HeatmapSlot]

class AdvancedAnalyticsResponse(BaseModel):
    pareto: List[ParetoData]
    vendors: List[VendorData]
    financial: FinancialEfficiency
    heatmap: List[HeatmapDay]

class GateActivityAnalytics(BaseModel):
    total_entries_today: int
    pending_approvals: int

class EventParticipationAnalytics(BaseModel):
    id: int
    title: str
    rsvp_count: int
    starts_at: str

class InventoryStatusAnalytics(BaseModel):
    low_stock_items: int
    total_items: int

class RosterCoverageAnalytics(BaseModel):
    active_staff_today: int
    checked_in_now: int

class StaffAnalyticsResponse(BaseModel):
    gate_activity: GateActivityAnalytics
    events: List[EventParticipationAnalytics]
    inventory: InventoryStatusAnalytics
    roster: RosterCoverageAnalytics
