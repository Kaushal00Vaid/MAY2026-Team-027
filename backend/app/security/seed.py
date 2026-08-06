from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.db.models.role import Role, RoleName, UserRole
from app.db.models.user import User
from app.security.models import AccessLog, Visitor

PASSWORD = "Demo@123"


def seed_security(db: Session, roles: dict[RoleName, Role]) -> None:
    guard = db.scalar(select(User).where(User.email == "security@societysync.demo"))
    if not guard:
        guard = User(
            first_name="Ravi",
            last_name="Guard",
            email="security@societysync.demo",
            phone_number="+919100000005",
            password_hash=hash_password(PASSWORD),
            staff_type="Security",
            is_active=True,
            is_phone_verified=True,
        )
        db.add(guard)
        db.flush()
        db.add(
            UserRole(
                user_id=guard.user_id, role_id=roles[RoleName.support_staff].role_id
            )
        )
    residents = list(
        db.scalars(
            select(User).where(User.flat_number.is_not(None)).order_by(User.user_id)
        ).all()
    )
    if not residents:
        raise RuntimeError("Security seed requires demo residents.")
    marker = "[DEMO] Grocery delivery"
    if not db.scalar(select(Visitor).where(Visitor.visitor_name == marker)):
        pending = Visitor(
            resident_id=residents[0].user_id,
            visitor_name=marker,
            phone_number="+919876543210",
            purpose="Delivery",
            requested_by=guard.user_id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        db.add(pending)
        db.flush()
        db.add(
            AccessLog(
                resident_id=residents[0].user_id,
                visitor_id=pending.id,
                actor_id=guard.user_id,
                event_type="approval_requested",
                subject_name=pending.visitor_name,
                unit=residents[0].flat_number,
                details=pending.purpose,
            )
        )
    db.commit()
    print("  [create] Security demo account/data ready (password: Demo@123).")
