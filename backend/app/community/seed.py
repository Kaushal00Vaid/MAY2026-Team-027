from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.community.models import (
    CommunityEvent,
    DiscussionLike,
    DiscussionReply,
    DiscussionThread,
    Notice,
    NoticeDelivery,
    Poll,
    PollOption,
    PollVote,
    VolunteerOpportunity,
    VolunteerSignup,
)
from app.db.models.user import User


def seed_community(db: Session, admin: User) -> None:
    residents = list(db.scalars(select(User).where(User.flat_number.is_not(None)).order_by(User.user_id)).all())
    if not residents:
        raise RuntimeError("Community seed requires resident demo users. Run the Helpdesk seed first.")
    now = datetime.now(timezone.utc)

    if not db.scalar(select(Notice).where(Notice.title == "Scheduled Water Maintenance")):
        notices = [
            Notice(title="Scheduled Water Maintenance", body="Water supply will be interrupted between 2 PM and 4 PM for routine pump maintenance.", target_type="block", target_value="A", created_by=admin.user_id),
            Notice(title="Annual General Meeting Minutes", body="The latest AGM minutes are now available for residents to review.", target_type="all", created_by=admin.user_id),
            Notice(title="Elevator Servicing", body="Passenger elevator servicing is scheduled for two hours.", target_type="block", target_value="B", created_by=admin.user_id),
        ]
        db.add_all(notices)
        db.flush()
        for notice in notices:
            recipients = residents if notice.target_type == "all" else [resident for resident in residents if (resident.building_block or "").lower() == (notice.target_value or "").lower()]
            db.add_all(NoticeDelivery(notice_id=notice.id, user_id=resident.user_id) for resident in recipients)

    if not db.scalar(select(CommunityEvent).where(CommunityEvent.title == "Monsoon Community Mixer")):
        db.add_all([
            CommunityEvent(title="Monsoon Community Mixer", description="Meet neighbours over music and refreshments.", location="Clubhouse", starts_at=now + timedelta(days=7), ends_at=now + timedelta(days=7, hours=3), capacity=80, created_by=admin.user_id),
            CommunityEvent(title="Morning Yoga Workshop", description="A guided beginner-friendly yoga session.", location="Central Lawn", starts_at=now + timedelta(days=14), ends_at=now + timedelta(days=14, hours=2), capacity=30, created_by=admin.user_id),
        ])

    if not db.scalar(select(VolunteerOpportunity).where(VolunteerOpportunity.title == "Festive Decoration Committee")):
        opportunity = VolunteerOpportunity(title="Festive Decoration Committee", description="Help set up lights and displays for the upcoming celebration.", volunteers_needed=3, closes_at=now + timedelta(days=10), created_by=admin.user_id)
        db.add(opportunity)
        db.flush()
        db.add(VolunteerSignup(opportunity_id=opportunity.id, user_id=residents[-1].user_id))

    if not db.scalar(select(Poll).where(Poll.question == "New Amenity Addition: Quarter 4")):
        poll = Poll(question="New Amenity Addition: Quarter 4", description="Vote for the next community upgrade.", starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=14), created_by=admin.user_id)
        db.add(poll)
        db.flush()
        options = [PollOption(poll_id=poll.id, label=label, display_order=index) for index, label in enumerate(("Pickleball Court", "Co-working Space Expansion", "Community Garden"), 1)]
        db.add_all(options)
        db.flush()
        if len(residents) > 1:
            db.add(PollVote(poll_id=poll.id, option_id=options[0].id, user_id=residents[-1].user_id))

    if not db.scalar(select(DiscussionThread).where(DiscussionThread.title == "Festival Decoration Ideas")):
        thread = DiscussionThread(title="Festival Decoration Ideas", body="Share ideas for this year's common-area decorations.", tag="Events", created_by=residents[0].user_id)
        db.add(thread)
        db.flush()
        if len(residents) > 1:
            db.add_all([
                DiscussionReply(thread_id=thread.id, user_id=residents[-1].user_id, body="Solar string lights would work well."),
                DiscussionLike(thread_id=thread.id, user_id=residents[-1].user_id),
            ])
    db.commit()
    print("  [create] Community demo data ready.")
