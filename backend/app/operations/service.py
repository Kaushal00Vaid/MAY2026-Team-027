import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, or_, select

from app.db.models.role import Role, RoleName, UserRole
from app.db.models.user import User
from app.realtime.service import add_notifications, user_ids_for_roles
from app.operations.models import (
    InventoryItem,
    InventoryUnit,
    OperationalTask,
    ShiftAssignment,
    StaffAttendance,
    StockMovement,
    Vendor,
)
from app.operations.permissions import (
    ensure_ops,
    ensure_staff,
    ensure_staff_or_ops,
    is_operational,
    is_staff,
)

IST = ZoneInfo("Asia/Kolkata")


def _name(user):
    return f"{user.first_name} {user.last_name}"


def _task(db, item):
    staff = db.get(User, item.assigned_to)
    return {
        "id": item.id,
        "title": item.title,
        "location": item.location,
        "category": item.category,
        "assigned_to": item.assigned_to,
        "assigned_name": _name(staff),
        "status": item.status,
        "due_at": item.due_at,
        "completed_at": item.completed_at,
        "completion_notes": item.completion_notes,
        "created_at": item.created_at,
    }


def _item(db, item):
    unit = db.get(InventoryUnit, item.unit_id)
    vendor = db.get(Vendor, item.vendor_id) if item.vendor_id else None
    quantity = Decimal(item.quantity)
    threshold = Decimal(item.reorder_threshold)
    status = (
        "LOW STOCK"
        if quantity <= threshold
        else "REORDER SOON"
        if threshold and quantity <= threshold * Decimal("1.5")
        else "OPTIMAL"
    )
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "quantity": float(quantity),
        "unit": unit.symbol,
        "reorder_threshold": float(threshold),
        "vendor": vendor.name if vendor else None,
        "status": status,
        "updated_at": item.updated_at,
    }


def _shift(db, item):
    staff = db.get(User, item.staff_id)
    return {
        "id": item.id,
        "staff_id": item.staff_id,
        "staff_name": _name(staff),
        "staff_type": staff.staff_type,
        "role_label": item.role_label,
        "start_time": item.start_time.isoformat(),
        "end_time": item.end_time.isoformat(),
        "days_mask": item.days_mask,
        "status": item.status,
        "phone": staff.phone_number,
    }


def staff_users(db, user):
    ensure_staff_or_ops(user)
    if not is_operational(user):
        return [
            {
                "user_id": user.user_id,
                "name": _name(user),
                "staff_type": user.staff_type,
            }
        ]
    query = (
        select(User)
        .join(UserRole, UserRole.user_id == User.user_id)
        .join(Role, Role.role_id == UserRole.role_id)
        .where(Role.role_name == RoleName.support_staff, User.is_active.is_(True))
        .order_by(User.first_name)
    )
    return [
        {"user_id": u.user_id, "name": _name(u), "staff_type": u.staff_type}
        for u in db.scalars(query).all()
    ]


def list_tasks(db, user, status=None):
    ensure_staff_or_ops(user)
    query = select(OperationalTask)
    if is_staff(user) and not is_operational(user):
        query = query.where(OperationalTask.assigned_to == user.user_id)
    if status:
        query = query.where(OperationalTask.status == status)
    return [
        _task(db, x)
        for x in db.scalars(query.order_by(OperationalTask.created_at.desc())).all()
    ]


def create_task(db, user, data):
    ensure_staff_or_ops(user)
    assigned = (
        data.assigned_to if is_operational(user) and data.assigned_to else user.user_id
    )
    target = db.get(User, assigned)
    if not target or not is_staff(target):
        raise HTTPException(
            status_code=422, detail="Assigned user must be active support staff."
        )
    item = OperationalTask(
        **data.model_dump(exclude={"assigned_to"}),
        assigned_to=assigned,
        created_by=user.user_id,
    )
    db.add(item)
    db.flush()
    add_notifications(db, [assigned], event_type="task.assigned", title="New task assigned", message=item.title, resource_type="operational_task", resource_id=item.id, payload={"scope": "operations", "status": item.status})
    db.commit()
    db.refresh(item)
    return _task(db, item)


def update_task(db, user, task_id, data):
    ensure_staff_or_ops(user)
    item = db.scalar(
        select(OperationalTask).where(OperationalTask.id == task_id).with_for_update()
    )
    if not item or (not is_operational(user) and item.assigned_to != user.user_id):
        raise HTTPException(status_code=404, detail="Task not found.")
    allowed = {
        "pending": {"in_progress", "cancelled"},
        "in_progress": {"completed", "cancelled"},
        "completed": set(),
        "cancelled": set(),
    }
    if data.status != item.status and data.status not in allowed[item.status]:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot change task from {item.status} to {data.status}.",
        )
    if data.status == "completed" and not (data.completion_notes or "").strip():
        raise HTTPException(status_code=422, detail="Completion notes are required.")
    item.status = data.status
    item.completion_notes = (
        data.completion_notes.strip() if data.completion_notes else None
    )
    item.completed_at = (
        datetime.now(timezone.utc) if data.status == "completed" else None
    )
    add_notifications(db, [item.assigned_to], event_type="task.changed", title="Task updated", message=f"{item.title} is now {item.status.replace('_', ' ')}.", resource_type="operational_task", resource_id=item.id, payload={"scope": "operations", "status": item.status})
    db.commit()
    db.refresh(item)
    return _task(db, item)


def list_inventory(db, user, search=None):
    ensure_staff_or_ops(user)
    query = select(InventoryItem).where(InventoryItem.is_active.is_(True))
    if search:
        query = query.where(
            or_(
                InventoryItem.name.ilike(f"%{search}%"),
                InventoryItem.category.ilike(f"%{search}%"),
            )
        )
    return [_item(db, x) for x in db.scalars(query.order_by(InventoryItem.name)).all()]


def create_item(db, user, data):
    ensure_staff_or_ops(user)
    if db.scalar(
        select(InventoryItem.id).where(
            func.lower(InventoryItem.name) == data.name.strip().casefold()
        )
    ):
        raise HTTPException(status_code=409, detail="Inventory item already exists.")
    unit = db.scalar(
        select(InventoryUnit).where(
            func.lower(InventoryUnit.symbol) == data.unit_symbol.strip().casefold()
        )
    )
    if not unit:
        raise HTTPException(status_code=422, detail="Unknown inventory unit.")
    item = InventoryItem(
        name=data.name.strip(),
        category=data.category.strip(),
        unit_id=unit.id,
        vendor_id=data.vendor_id,
        quantity=data.initial_quantity,
        reorder_threshold=data.reorder_threshold,
    )
    db.add(item)
    db.flush()
    if data.initial_quantity:
        db.add(
            StockMovement(
                item_id=item.id,
                movement_type="received",
                quantity_delta=data.initial_quantity,
                resulting_quantity=data.initial_quantity,
                note="Opening stock",
                recorded_by=user.user_id,
            )
        )
    db.commit()
    db.refresh(item)
    return _item(db, item)


def movement(db, user, item_id, data):
    ensure_staff_or_ops(user)
    item = db.scalar(
        select(InventoryItem)
        .where(InventoryItem.id == item_id, InventoryItem.is_active.is_(True))
        .with_for_update()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    delta = Decimal(data.quantity) * (-1 if data.movement_type == "consumed" else 1)
    result = Decimal(item.quantity) + delta
    if result < 0:
        raise HTTPException(
            status_code=409, detail="Insufficient stock for this movement."
        )
    item.quantity = result
    entry = StockMovement(
        item_id=item.id,
        movement_type=data.movement_type,
        quantity_delta=delta,
        resulting_quantity=result,
        note=data.note.strip(),
        recorded_by=user.user_id,
    )
    db.add(entry)
    if result <= Decimal(item.reorder_threshold):
        recipients = user_ids_for_roles(db, ["super_admin", "admin", "committee_member", "support_staff"])
        add_notifications(db, recipients, event_type="inventory.low_stock", title="Low stock alert", message=f"{item.name} is at {result} {db.get(InventoryUnit, item.unit_id).symbol}.", resource_type="inventory_item", resource_id=item.id, payload={"scope": "inventory", "quantity": str(result)})
    db.commit()
    db.refresh(item)
    return _item(db, item)


def list_units_vendors(db, user):
    ensure_staff_or_ops(user)
    return {
        "units": [
            {"name": x.name, "symbol": x.symbol}
            for x in db.scalars(
                select(InventoryUnit).order_by(InventoryUnit.name)
            ).all()
        ],
        "vendors": [
            {"id": x.id, "name": x.name}
            for x in db.scalars(
                select(Vendor).where(Vendor.is_active.is_(True)).order_by(Vendor.name)
            ).all()
        ],
    }


def list_shifts(db, user):
    ensure_staff_or_ops(user)
    query = select(ShiftAssignment)
    if not is_operational(user):
        query = query.where(ShiftAssignment.staff_id == user.user_id)
    return [
        _shift(db, x)
        for x in db.scalars(query.order_by(ShiftAssignment.start_time)).all()
    ]


def create_shift(db, user, data):
    ensure_ops(user)
    staff = db.get(User, data.staff_id)
    if not staff or not is_staff(staff):
        raise HTTPException(status_code=422, detail="Shift user must be support staff.")
    if data.start_time == data.end_time:
        raise HTTPException(status_code=422, detail="Shift start and end cannot match.")
    patterns = db.scalars(
        select(ShiftAssignment).where(
            ShiftAssignment.staff_id == data.staff_id,
            ShiftAssignment.status == "active",
        )
    ).all()
    for old in patterns:

        def ranges(start, end):
            start_min = start.hour * 60 + start.minute
            end_min = end.hour * 60 + end.minute
            return (
                [(start_min, end_min)]
                if start_min < end_min
                else [(start_min, 1440), (0, end_min)]
            )

        overlaps = any(
            a < d and c < b
            for a, b in ranges(old.start_time, old.end_time)
            for c, d in ranges(data.start_time, data.end_time)
        )
        if old.days_mask & data.days_mask and overlaps:
            raise HTTPException(
                status_code=409, detail="This staff member has an overlapping shift."
            )
    item = ShiftAssignment(**data.model_dump(), assigned_by=user.user_id)
    db.add(item)
    db.flush()
    add_notifications(db, [item.staff_id], event_type="roster.assigned", title="Shift assigned", message=f"A {item.role_label} shift was added to your roster.", resource_type="shift", resource_id=item.id, payload={"scope": "roster", "status": item.status})
    db.commit()
    db.refresh(item)
    return _shift(db, item)


def shift_status(db, user, shift_id, data):
    ensure_ops(user)
    item = db.get(ShiftAssignment, shift_id)
    if not item:
        raise HTTPException(status_code=404, detail="Shift not found.")
    item.status = data.status
    add_notifications(db, [item.staff_id], event_type="roster.changed", title="Shift status updated", message=f"Your shift is now {item.status.replace('_', ' ')}.", resource_type="shift", resource_id=item.id, payload={"scope": "roster", "status": item.status})
    db.commit()
    db.refresh(item)
    return _shift(db, item)


def attendance_today(db, user):
    ensure_staff(user)
    today = datetime.now(IST).date()
    item = db.scalar(
        select(StaffAttendance).where(
            StaffAttendance.staff_id == user.user_id,
            StaffAttendance.attendance_date == today,
        )
    )
    return {
        "date": today,
        "checked_in": bool(item and item.check_in_at),
        "checked_out": bool(item and item.check_out_at),
        "check_in_at": item.check_in_at if item else None,
        "check_out_at": item.check_out_at if item else None,
    }


def toggle_attendance(db, user):
    ensure_staff(user)
    today = datetime.now(IST).date()
    item = db.scalar(
        select(StaffAttendance)
        .where(
            StaffAttendance.staff_id == user.user_id,
            StaffAttendance.attendance_date == today,
        )
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    if not item:
        item = StaffAttendance(
            staff_id=user.user_id, attendance_date=today, check_in_at=now
        )
        db.add(item)
    elif not item.check_out_at:
        item.check_out_at = now
    else:
        raise HTTPException(
            status_code=409, detail="Today's attendance is already complete."
        )
    db.commit()
    return attendance_today(db, user)


def csv_export(headers, rows):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(headers)
    writer.writerows(rows)
    return stream.getvalue()
