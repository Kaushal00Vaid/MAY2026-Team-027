from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.auth.password import hash_password
from app.db.models.complaint import Complaint
from app.db.models.role import Role, RoleName, UserRole
from app.db.models.user import User
from app.helpdesk.complaints.models import ComplaintStatusHistory
from app.helpdesk.work_orders.models import MaintenanceWorkOrder, StaffDutyState


DEMO_PASSWORD = "Demo@123"
DEMO_USERS = (
    ("resident.a@societysync.demo", "+919100000001", "Asha", "Resident", RoleName.flat_owner, "A-101", None),
    ("resident.b@societysync.demo", "+919100000002", "Bharat", "Resident", RoleName.resident_rental, "B-202", None),
    ("maintenance@societysync.demo", "+919100000003", "Mohan", "Technician", RoleName.support_staff, None, "Maintenance"),
    ("committee@societysync.demo", "+919100000004", "Kavya", "Committee", RoleName.committee_member, None, None),
)


def _demo_user(db: Session, roles: dict[RoleName, Role], data) -> User:
    email, phone, first, last, role_name, flat, staff_type = data
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(
            first_name=first,
            last_name=last,
            email=email,
            phone_number=phone,
            password_hash=hash_password(DEMO_PASSWORD),
            flat_number=flat,
            building_block=flat[0] if flat else None,
            staff_type=staff_type,
            is_active=True,
            is_phone_verified=True,
        )
        db.add(user)
        db.flush()
    assignment = db.scalar(
        select(UserRole).where(
            UserRole.user_id == user.user_id,
            UserRole.role_id == roles[role_name].role_id,
        )
    )
    if not assignment:
        db.add(UserRole(user_id=user.user_id, role_id=roles[role_name].role_id))
    return user


def seed_helpdesk(db: Session, roles: dict[RoleName, Role], admin: User) -> None:
    schema = inspect(db.get_bind())
    complaint_columns = {
        column["name"] for column in schema.get_columns("complaints")
    }
    required_columns = {"resolution_notes", "resolved_at", "escalated_at"}
    required_tables = {
        "maintenance_work_orders",
        "work_order_resolution_photos",
        "helpdesk_staff_duty_states",
        "known_issue_subscriptions",
    }
    missing_columns = sorted(required_columns - complaint_columns)
    missing_tables = sorted(
        table for table in required_tables if not schema.has_table(table)
    )
    if missing_columns or missing_tables:
        details = []
        if missing_columns:
            details.append(f"complaints columns: {', '.join(missing_columns)}")
        if missing_tables:
            details.append(f"tables: {', '.join(missing_tables)}")
        raise RuntimeError(
            "Helpdesk database schema is not current (missing "
            + "; ".join(details)
            + "). Run 'alembic upgrade head' before running the seed command."
        )

    resident_a, resident_b, staff, _committee = [_demo_user(db, roles, data) for data in DEMO_USERS]
    db.flush()
    marker = "[DEMO] Main-line water leak"
    complaint = db.scalar(select(Complaint).where(Complaint.title == marker))
    if not complaint:
        complaint = Complaint(
            user_id=resident_a.user_id,
            title=marker,
            category="Plumbing",
            description="Water is leaking near the Block A lift lobby.",
            location="Block A, Lift Lobby",
            priority="Critical",
            status="In Progress",
            assigned_to=staff.user_id,
            sla_deadline=datetime.now(timezone.utc) - timedelta(hours=1),
            version=2,
        )
        db.add(complaint)
        db.flush()
        db.add_all(
            [
                ComplaintStatusHistory(
                    complaint_id=complaint.id,
                    from_status=None,
                    to_status="Open",
                    changed_by=resident_a.user_id,
                    note="Complaint created",
                ),
                ComplaintStatusHistory(
                    complaint_id=complaint.id,
                    from_status="Open",
                    to_status="In Progress",
                    changed_by=admin.user_id,
                    note="Assigned to demo maintenance staff",
                ),
                MaintenanceWorkOrder(
                    complaint_id=complaint.id,
                    assigned_to=staff.user_id,
                    assigned_by=admin.user_id,
                    status="Assigned",
                    instructions=[
                        "Inspect and isolate the leak source",
                        "Repair the affected pipe",
                        "Upload proof of the completed repair",
                    ],
                ),
            ]
        )
    if not db.get(StaffDutyState, staff.user_id):
        db.add(StaffDutyState(user_id=staff.user_id, on_duty=True))

    second_marker = "[DEMO] Corridor light flickering"
    if not db.scalar(select(Complaint).where(Complaint.title == second_marker)):
        second = Complaint(
            user_id=resident_b.user_id,
            title=second_marker,
            category="Electrical",
            description="The first-floor corridor light flickers throughout the evening.",
            location="Block B, Floor 1",
            priority="Medium",
            status="Open",
            sla_deadline=datetime.now(timezone.utc) + timedelta(hours=20),
            version=1,
        )
        db.add(second)
        db.flush()
        db.add(
            ComplaintStatusHistory(
                complaint_id=second.id,
                from_status=None,
                to_status="Open",
                changed_by=resident_b.user_id,
                note="Complaint created",
            )
        )
    db.commit()
    print("  [create] Helpdesk demo users/data ready (password: Demo@123).")
