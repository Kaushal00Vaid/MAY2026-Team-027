import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models.user import User
from app.security.models import AccessLog, GuestPass, Visitor
from app.realtime.service import add_notifications
from app.security.permissions import (
    ensure_gate,
    ensure_resident,
    is_operational,
    is_resident,
)


def now():
    return datetime.now(timezone.utc)


def name(user):
    return f"{user.first_name} {user.last_name}"


def digest(pin):
    return hmac.new(
        settings.JWT_SECRET.encode(), pin.encode(), hashlib.sha256
    ).hexdigest()


def issue_resident_id(user):
    ensure_resident(user)
    expires_at = now() + timedelta(seconds=30)
    payload = (
        base64.urlsafe_b64encode(
            json.dumps(
                {"sub": user.user_id, "exp": int(expires_at.timestamp())},
                separators=(",", ":"),
            ).encode()
        )
        .decode()
        .rstrip("=")
    )
    signature = hmac.new(
        settings.JWT_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return {"token": f"{payload}.{signature}", "expires_at": expires_at}


def verify_resident_id(db, user, token):
    ensure_gate(user)
    try:
        payload, signature = token.rsplit(".", 1)
        expected = hmac.new(
            settings.JWT_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        decoded = json.loads(
            base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)).decode()
        )
        if int(decoded["exp"]) <= int(now().timestamp()):
            raise ValueError
        resident = db.get(User, int(decoded["sub"]))
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=401, detail="Resident ID is invalid or expired."
        ) from None
    if not resident or not resident.is_active or not is_resident(resident):
        raise HTTPException(
            status_code=401, detail="Resident ID is invalid or expired."
        )
    log = AccessLog(
        resident_id=resident.user_id,
        actor_id=user.user_id,
        event_type="resident_entry",
        subject_name=name(resident),
        unit=resident.flat_number,
        details="Dynamic resident ID verified",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log_dict(log)


def expire_visitors(db: Session) -> None:
    expired = db.scalars(
        select(Visitor).where(Visitor.status == "pending", Visitor.expires_at <= now())
    ).all()
    for item in expired:
        item.status = "expired"
        item.version += 1
        db.add(
            AccessLog(
                resident_id=item.resident_id,
                visitor_id=item.id,
                event_type="visitor_expired",
                subject_name=item.visitor_name,
                unit=db.get(User, item.resident_id).flat_number,
            )
        )
    if expired:
        db.commit()


def visitor_dict(db, item):
    resident = db.get(User, item.resident_id)
    return {
        "id": item.id,
        "visitor_name": item.visitor_name,
        "phone_number": item.phone_number,
        "purpose": item.purpose,
        "vehicle_number": item.vehicle_number,
        "unit": resident.flat_number,
        "resident_name": name(resident),
        "resident_note": item.resident_note,
        "status": item.status,
        "requested_at": item.requested_at,
        "expires_at": item.expires_at,
        "entry_at": item.entry_at,
        "exit_at": item.exit_at,
        "version": item.version,
    }


def create_visitor(db: Session, actor: User, data):
    ensure_gate(actor)
    resident = db.scalar(
        select(User).where(
            func.lower(User.flat_number) == data.target_unit.lower(),
            User.is_active.is_(True),
        )
    )
    if not resident or not is_resident(resident):
        raise HTTPException(status_code=404, detail="Active resident unit not found.")
    item = Visitor(
        resident_id=resident.user_id,
        visitor_name=data.visitor_name,
        phone_number=data.phone_number,
        purpose=data.purpose,
        vehicle_number=data.vehicle_number,
        requested_by=actor.user_id,
        expires_at=now() + timedelta(minutes=15),
    )
    db.add(item)
    db.flush()
    db.add(
        AccessLog(
            resident_id=resident.user_id,
            visitor_id=item.id,
            actor_id=actor.user_id,
            event_type="approval_requested",
            subject_name=item.visitor_name,
            unit=resident.flat_number,
            details=item.purpose,
        )
    )
    add_notifications(
        db,
        [resident.user_id],
        event_type="visitor.approval_requested",
        title="Visitor approval requested",
        message=f"{item.visitor_name} is waiting for your approval.",
        resource_type="visitor",
        resource_id=item.id,
        payload={"scope": "security", "status": "pending"},
    )
    db.commit()
    db.refresh(item)
    return visitor_dict(db, item)


def list_visitors(db, user, page, page_size, search=None, status=None):
    expire_visitors(db)
    filters = []
    if is_resident(user):
        filters.append(Visitor.resident_id == user.user_id)
    elif not is_operational(user):
        ensure_gate(user)
    if status:
        filters.append(Visitor.status == status)
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                Visitor.visitor_name.ilike(pattern),
                Visitor.purpose.ilike(pattern),
                Visitor.vehicle_number.ilike(pattern),
                Visitor.resident_id.in_(
                    select(User.user_id).where(User.flat_number.ilike(pattern))
                ),
            )
        )
    total = db.scalar(select(func.count(Visitor.id)).where(*filters)) or 0
    items = db.scalars(
        select(Visitor)
        .where(*filters)
        .order_by(Visitor.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [visitor_dict(db, item) for item in items], total


def decide(db, user, visitor_id, decision, version, note=None):
    if not (is_resident(user) or is_operational(user)):
        raise HTTPException(
            status_code=403, detail="Resident or admin decision required."
        )
    expire_visitors(db)
    item = db.scalar(select(Visitor).where(Visitor.id == visitor_id).with_for_update())
    if not item or (is_resident(user) and item.resident_id != user.user_id):
        raise HTTPException(status_code=404, detail="Visitor request not found.")
    if item.version != version:
        raise HTTPException(
            status_code=409, detail="Visitor request changed; refresh and retry."
        )
    if item.status != "pending" or item.expires_at <= now():
        raise HTTPException(
            status_code=409, detail="Visitor request is no longer pending."
        )
    item.status = decision
    item.decision_note = note
    item.decided_by = user.user_id
    item.decision_at = now()
    item.version += 1
    resident = db.get(User, item.resident_id)
    db.add(
        AccessLog(
            resident_id=item.resident_id,
            visitor_id=item.id,
            actor_id=user.user_id,
            event_type=f"visitor_{decision}",
            subject_name=item.visitor_name,
            unit=resident.flat_number,
            details=note,
        )
    )
    add_notifications(
        db,
        [item.requested_by, item.resident_id],
        event_type=f"visitor.{decision}",
        title=f"Visitor {decision}",
        message=f"{item.visitor_name}'s visit was {decision}.",
        resource_type="visitor",
        resource_id=item.id,
        payload={"scope": "security", "status": decision},
    )
    db.commit()
    db.refresh(item)
    return visitor_dict(db, item)


def gate_transition(db, user, visitor_id, action):
    ensure_gate(user)
    item = db.scalar(select(Visitor).where(Visitor.id == visitor_id).with_for_update())
    expected = "approved" if action == "entry" else "inside"
    if not item:
        raise HTTPException(status_code=404, detail="Visitor not found.")
    if item.status != expected:
        raise HTTPException(
            status_code=409, detail=f"Visitor must be {expected} before {action}."
        )
    timestamp = now()
    item.status = "inside" if action == "entry" else "exited"
    item.entry_at = timestamp if action == "entry" else item.entry_at
    item.exit_at = timestamp if action == "exit" else item.exit_at
    item.version += 1
    resident = db.get(User, item.resident_id)
    db.add(
        AccessLog(
            resident_id=item.resident_id,
            visitor_id=item.id,
            actor_id=user.user_id,
            event_type=f"visitor_{action}",
            subject_name=item.visitor_name,
            unit=resident.flat_number,
        )
    )
    add_notifications(
        db,
        [item.resident_id],
        event_type=f"visitor.{action}",
        title=f"Visitor {action}",
        message=f"{item.visitor_name} recorded {action} at the gate.",
        resource_type="visitor",
        resource_id=item.id,
        payload={"scope": "security", "status": item.status},
    )
    db.commit()
    db.refresh(item)
    return visitor_dict(db, item)


def pass_dict(item, pin=None):
    state = (
        "revoked"
        if item.revoked_at
        else "used"
        if item.used_at
        else "expired"
        if item.valid_until <= now()
        else "active"
    )
    return {
        "id": item.id,
        "guest_name": item.guest_name,
        "purpose": item.purpose,
        "public_id": item.public_id,
        "valid_until": item.valid_until,
        "used_at": item.used_at,
        "revoked_at": item.revoked_at,
        "status": state,
        "pin": pin,
    }


def create_pass(db, user, data):
    ensure_resident(user)
    for _ in range(20):
        pin = f"{secrets.randbelow(10000):04d}"
        if not db.scalar(
            select(GuestPass.id).where(GuestPass.pin_digest == digest(pin))
        ):
            break
    else:
        raise HTTPException(
            status_code=503, detail="Unable to allocate a guest PIN; retry shortly."
        )
    item = GuestPass(
        resident_id=user.user_id,
        guest_name=data.guest_name.strip(),
        phone_number=data.phone_number,
        purpose=data.purpose,
        public_id=secrets.token_urlsafe(24),
        pin_digest=digest(pin),
        valid_from=now(),
        valid_until=now() + timedelta(hours=data.valid_hours),
    )
    db.add(item)
    db.flush()
    db.add(
        AccessLog(
            resident_id=user.user_id,
            guest_pass_id=item.id,
            actor_id=user.user_id,
            event_type="guest_pass_created",
            subject_name=item.guest_name,
            unit=user.flat_number,
        )
    )
    db.commit()
    db.refresh(item)
    return pass_dict(item, pin)


def list_passes(db, user):
    ensure_resident(user)
    return [
        pass_dict(item)
        for item in db.scalars(
            select(GuestPass)
            .where(GuestPass.resident_id == user.user_id)
            .order_by(GuestPass.created_at.desc())
            .limit(20)
        ).all()
    ]


def revoke_pass(db, user, pass_id):
    ensure_resident(user)
    item = db.scalar(
        select(GuestPass)
        .where(GuestPass.id == pass_id, GuestPass.resident_id == user.user_id)
        .with_for_update()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Guest pass not found.")
    if item.used_at:
        raise HTTPException(
            status_code=409, detail="Used guest passes cannot be revoked."
        )
    item.revoked_at = item.revoked_at or now()
    db.commit()
    return pass_dict(item)


def verify_pin(db, user, pin):
    ensure_gate(user)
    item = db.scalar(
        select(GuestPass).where(GuestPass.pin_digest == digest(pin)).with_for_update()
    )
    if (
        not item
        or item.revoked_at
        or item.used_at
        or not (item.valid_from <= now() < item.valid_until)
    ):
        raise HTTPException(
            status_code=404, detail="PIN is invalid, expired, revoked, or already used."
        )
    item.used_at = now()
    resident = db.get(User, item.resident_id)
    db.add(
        AccessLog(
            resident_id=item.resident_id,
            guest_pass_id=item.id,
            actor_id=user.user_id,
            event_type="guest_entry",
            subject_name=item.guest_name,
            unit=resident.flat_number,
            details=item.purpose,
        )
    )
    db.commit()
    return pass_dict(item)


def manual_entry(db, user, unit):
    ensure_gate(user)
    resident = db.scalar(
        select(User).where(
            func.lower(User.flat_number) == unit.strip().lower(),
            User.is_active.is_(True),
        )
    )
    if not resident or not is_resident(resident):
        raise HTTPException(status_code=404, detail="Active resident unit not found.")
    log = AccessLog(
        resident_id=resident.user_id,
        actor_id=user.user_id,
        event_type="resident_entry",
        subject_name=name(resident),
        unit=resident.flat_number,
        details="Manual unit verification",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log_dict(log)


def log_dict(item):
    return {
        "id": item.id,
        "event_type": item.event_type,
        "subject_name": item.subject_name,
        "unit": item.unit,
        "gate": item.gate,
        "details": item.details,
        "occurred_at": item.occurred_at,
    }


def logs(db, user, limit=100):
    query = select(AccessLog)
    if is_resident(user):
        query = query.where(AccessLog.resident_id == user.user_id)
    elif not is_operational(user):
        ensure_gate(user)
    return [
        log_dict(item)
        for item in db.scalars(
            query.order_by(AccessLog.occurred_at.desc()).limit(limit)
        ).all()
    ]
