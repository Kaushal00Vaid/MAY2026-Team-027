from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db.database import Base


class Notice(Base):
    __tablename__ = "community_notices"
    __table_args__ = (
        CheckConstraint("target_type IN ('all', 'block', 'flat')", name="ck_notice_target"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    target_type = Column(String(20), nullable=False, server_default="all")
    target_value = Column(String(50), nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    published_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")


class NoticeDelivery(Base):
    __tablename__ = "community_notice_deliveries"
    __table_args__ = (UniqueConstraint("notice_id", "user_id", name="uq_notice_delivery"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    notice_id = Column(BigInteger, ForeignKey("community_notices.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    delivered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)


class CommunityEvent(Base):
    __tablename__ = "community_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class EventRsvp(Base):
    __tablename__ = "community_event_rsvps"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_rsvp"),
        CheckConstraint("status IN ('going', 'not_going')", name="ck_event_rsvp_status"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_id = Column(BigInteger, ForeignKey("community_events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class VolunteerOpportunity(Base):
    __tablename__ = "community_volunteer_opportunities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    volunteers_needed = Column(Integer, nullable=False)
    closes_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class VolunteerSignup(Base):
    __tablename__ = "community_volunteer_signups"
    __table_args__ = (UniqueConstraint("opportunity_id", "user_id", name="uq_volunteer_signup"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    opportunity_id = Column(BigInteger, ForeignKey("community_volunteer_opportunities.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Poll(Base):
    __tablename__ = "community_polls"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    question = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    starts_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    is_active = Column(Boolean, nullable=False, server_default="true")


class PollOption(Base):
    __tablename__ = "community_poll_options"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    poll_id = Column(BigInteger, ForeignKey("community_polls.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(255), nullable=False)
    display_order = Column(Integer, nullable=False, server_default="0")


class PollVote(Base):
    __tablename__ = "community_poll_votes"
    __table_args__ = (UniqueConstraint("poll_id", "user_id", name="uq_poll_vote"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    poll_id = Column(BigInteger, ForeignKey("community_polls.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(BigInteger, ForeignKey("community_poll_options.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DiscussionThread(Base):
    __tablename__ = "community_discussion_threads"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    tag = Column(String(50), nullable=False, server_default="General")
    created_by = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DiscussionReply(Base):
    __tablename__ = "community_discussion_replies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    thread_id = Column(BigInteger, ForeignKey("community_discussion_threads.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"))
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DiscussionLike(Base):
    __tablename__ = "community_discussion_likes"
    __table_args__ = (UniqueConstraint("thread_id", "user_id", name="uq_discussion_like"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    thread_id = Column(BigInteger, ForeignKey("community_discussion_threads.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
