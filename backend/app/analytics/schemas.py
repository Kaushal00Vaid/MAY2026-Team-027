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
