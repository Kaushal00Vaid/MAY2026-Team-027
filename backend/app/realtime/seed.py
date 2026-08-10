from sqlalchemy import select

from app.db.models.user import User
from app.realtime.models import Notification


def seed_realtime(db) -> None:
    marker = "system.demo_ready"
    users = db.scalars(select(User).where(User.is_active.is_(True))).all()
    existing = set(db.scalars(select(Notification.user_id).where(Notification.event_type == marker)).all())
    for user in users:
        if user.user_id not in existing:
            db.add(Notification(user_id=user.user_id, event_type=marker, title="Realtime is ready", message="Live SocietySync updates are enabled for this account.", payload={"scope": "system"}))
    db.commit()
