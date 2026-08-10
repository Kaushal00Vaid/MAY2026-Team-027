import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, get_db
from app.db.models.user import User
from app.dependencies import get_current_user
from app.config import settings
from app.realtime import schemas, service

router = APIRouter()


@router.post("/auth/ws-ticket", response_model=schemas.TicketResponse, tags=["Authentication"])
def websocket_ticket(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket, expires_at = service.issue_ticket(db, user)
    return {"ticket": ticket, "expires_at": expires_at}


@router.get("/api/v1/notifications", response_model=schemas.NotificationPage, tags=["Realtime & Notifications"])
def notifications(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), unread_only: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items, total, unread_count = service.list_notifications(db, user, page, page_size, unread_only)
    return {"items": items, "total": total, "unread_count": unread_count, "page": page, "page_size": page_size}


@router.patch("/api/v1/notifications/{notification_id}/read", response_model=schemas.NotificationResponse, tags=["Realtime & Notifications"])
def read_notification(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.mark_read(db, user, notification_id)


@router.post("/api/v1/notifications/read-all", response_model=schemas.ReadAllResponse, tags=["Realtime & Notifications"])
def read_all_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"updated_count": service.mark_all_read(db, user)}


def _consume(raw: str):
    with SessionLocal() as db:
        return service.consume_ticket(db, raw)


def _events(user_id: int, cursor: int):
    with SessionLocal() as db:
        return service.events_after(db, user_id, cursor)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, ticket: str = Query(..., min_length=20, max_length=200)):
    consumed = await asyncio.to_thread(_consume, ticket)
    if not consumed:
        await websocket.close(code=4401, reason="Invalid, expired, or already-used WebSocket ticket")
        return
    user_id, cursor = consumed
    await websocket.accept()
    await websocket.send_json({"type": "connection.ready", "cursor": cursor})
    reconnect_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    try:
        while True:
            if datetime.now(timezone.utc) >= reconnect_at:
                await websocket.close(code=4001, reason="Reconnect with a fresh authenticated ticket")
                return
            events = await asyncio.to_thread(_events, user_id, cursor)
            if events is None:
                await websocket.close(code=4403, reason="Account is no longer active")
                return
            for event in events:
                await websocket.send_json(jsonable_encoder({"type": "notification.created", "notification": event}))
                cursor = event["id"]
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=1.5)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                pass
    except (WebSocketDisconnect, RuntimeError):
        return
