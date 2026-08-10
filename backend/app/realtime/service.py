import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.db.models.role import Role, UserRole
from app.db.models.user import User
from app.realtime.models import Notification, WebSocketTicket

TICKET_LIFETIME_SECONDS = 60


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_ticket(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def issue_ticket(db: Session, user: User) -> tuple[str, datetime]:
    raw = secrets.token_urlsafe(32)
    expires_at = utcnow() + timedelta(seconds=TICKET_LIFETIME_SECONDS)
    # Only the newest unconsumed ticket for a user remains valid. Also prune
    # stale rows opportunistically so reconnects cannot grow this table forever.
    db.execute(delete(WebSocketTicket).where(WebSocketTicket.user_id == user.user_id, WebSocketTicket.used_at.is_(None)))
    db.execute(delete(WebSocketTicket).where(WebSocketTicket.expires_at < utcnow() - timedelta(days=1)))
    db.add(WebSocketTicket(user_id=user.user_id, token_hash=_hash_ticket(raw), expires_at=expires_at))
    db.commit()
    return raw, expires_at


def consume_ticket(db: Session, raw: str) -> tuple[int, int] | None:
    if not raw or len(raw) > 200:
        return None
    ticket = db.scalar(select(WebSocketTicket).where(WebSocketTicket.token_hash == _hash_ticket(raw)).with_for_update())
    current = utcnow()
    if not ticket or ticket.used_at is not None or ticket.expires_at <= current:
        db.rollback()
        return None
    user = db.get(User, ticket.user_id)
    if not user or not user.is_active:
        db.rollback()
        return None
    cursor = db.scalar(select(func.coalesce(func.max(Notification.id), 0)).where(Notification.user_id == user.user_id)) or 0
    user_id = int(user.user_id)
    ticket.used_at = current
    db.commit()
    return user_id, int(cursor)


def add_notifications(db: Session, user_ids: Iterable[int], *, event_type: str, title: str, message: str, resource_type: str | None = None, resource_id: int | str | None = None, payload: dict | None = None) -> None:
    unique_ids = {int(value) for value in user_ids if value is not None}
    if not unique_ids:
        return
    active_ids = set(db.scalars(select(User.user_id).where(User.user_id.in_(unique_ids), User.is_active.is_(True))).all())
    db.add_all(Notification(user_id=user_id, event_type=event_type, title=title, message=message, resource_type=resource_type, resource_id=str(resource_id) if resource_id is not None else None, payload=payload or {}) for user_id in active_ids)


def user_ids_for_roles(db: Session, role_names: Iterable[str]) -> set[int]:
    return set(db.scalars(select(User.user_id).join(UserRole, UserRole.user_id == User.user_id).join(Role, Role.role_id == UserRole.role_id).where(Role.role_name.in_(list(role_names)), User.is_active.is_(True))).all())


def serialize(item: Notification) -> dict:
    return {"id": item.id, "event_type": item.event_type, "title": item.title, "message": item.message, "resource_type": item.resource_type, "resource_id": item.resource_id, "payload": item.payload or {}, "is_read": item.is_read, "read_at": item.read_at, "created_at": item.created_at}


def list_notifications(db: Session, user: User, page: int, page_size: int, unread_only: bool):
    filters = [Notification.user_id == user.user_id]
    if unread_only:
        filters.append(Notification.is_read.is_(False))
    total = db.scalar(select(func.count(Notification.id)).where(*filters)) or 0
    unread_count = db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user.user_id, Notification.is_read.is_(False))) or 0
    items = db.scalars(select(Notification).where(*filters).order_by(Notification.created_at.desc(), Notification.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return [serialize(item) for item in items], total, unread_count


def mark_read(db: Session, user: User, notification_id: int) -> dict:
    item = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.user_id))
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if not item.is_read:
        item.is_read = True
        item.read_at = utcnow()
        db.commit()
        db.refresh(item)
    return serialize(item)


def mark_all_read(db: Session, user: User) -> int:
    result = db.execute(update(Notification).where(Notification.user_id == user.user_id, Notification.is_read.is_(False)).values(is_read=True, read_at=utcnow()))
    db.commit()
    return result.rowcount or 0


def events_after(db: Session, user_id: int, cursor: int, limit: int = 100) -> list[dict] | None:
    if not db.scalar(select(User.is_active).where(User.user_id == user_id)):
        return None
    items = db.scalars(select(Notification).where(Notification.user_id == user_id, Notification.id > cursor).order_by(Notification.id).limit(limit)).all()
    return [serialize(item) for item in items]
