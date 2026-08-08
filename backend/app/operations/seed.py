from datetime import time
from decimal import Decimal

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.operations.models import (
    InventoryItem,
    InventoryUnit,
    OperationalTask,
    ShiftAssignment,
    StockMovement,
    Vendor,
)


def seed_operations(db: Session, admin: User) -> None:
    schema = inspect(db.get_bind())
    required = (
        "operational_tasks",
        "inventory_units",
        "inventory_items",
        "inventory_stock_movements",
        "staff_shift_assignments",
    )
    missing = [x for x in required if not schema.has_table(x)]
    if missing:
        raise RuntimeError(
            "Staff Operations schema is not current (missing: "
            + ", ".join(missing)
            + "). Run 'alembic upgrade head'."
        )
    units = {}
    for name, symbol in (
        ("Kilogram", "kg"),
        ("Litre", "L"),
        ("Unit", "units"),
        ("Gallon", "gal"),
    ):
        unit = db.scalar(select(InventoryUnit).where(InventoryUnit.symbol == symbol))
        if not unit:
            unit = InventoryUnit(name=name, symbol=symbol)
            db.add(unit)
            db.flush()
        units[symbol] = unit
    vendor = db.scalar(select(Vendor).where(Vendor.name == "Green Valley Supplies"))
    if not vendor:
        vendor = Vendor(
            name="Green Valley Supplies",
            phone="+919100000099",
            email="supplies@societysync.demo",
        )
        db.add(vendor)
        db.flush()
    rows = (
        ("NPK Fertilizer 20-20-20", "Gardening", "kg", 45, 10),
        ("Heavy Duty Bleach", "Janitorial", "gal", 2, 3),
        ("Pruning Shears", "Tools", "units", 12, 4),
        ("Pesticide Spray", "Gardening", "L", 5, 4),
    )
    for name, category, symbol, qty, threshold in rows:
        if not db.scalar(select(InventoryItem).where(InventoryItem.name == name)):
            item = InventoryItem(
                name=name,
                category=category,
                unit_id=units[symbol].id,
                vendor_id=vendor.id,
                quantity=Decimal(qty),
                reorder_threshold=Decimal(threshold),
            )
            db.add(item)
            db.flush()
            db.add(
                StockMovement(
                    item_id=item.id,
                    movement_type="received",
                    quantity_delta=qty,
                    resulting_quantity=qty,
                    note="Demo opening stock",
                    recorded_by=admin.user_id,
                )
            )
    staff = list(
        db.scalars(
            select(User).where(User.staff_type.is_not(None)).order_by(User.user_id)
        ).all()
    )
    for person in staff:
        if not db.scalar(
            select(ShiftAssignment).where(ShiftAssignment.staff_id == person.user_id)
        ):
            db.add(
                ShiftAssignment(
                    staff_id=person.user_id,
                    role_label=person.staff_type or "Support",
                    start_time=time(9),
                    end_time=time(17),
                    days_mask=63,
                    status="active",
                    assigned_by=admin.user_id,
                )
            )
    maintenance = next(
        (x for x in staff if (x.staff_type or "").lower() == "maintenance"),
        staff[0] if staff else None,
    )
    if maintenance and not db.scalar(
        select(OperationalTask).where(
            OperationalTask.title == "[DEMO] Pool deck cleaning"
        )
    ):
        db.add_all(
            [
                OperationalTask(
                    title="[DEMO] Pool deck cleaning",
                    location="Clubhouse Exterior",
                    category="Cleaning",
                    assigned_to=maintenance.user_id,
                    created_by=admin.user_id,
                ),
                OperationalTask(
                    title="[DEMO] Sprinkler check",
                    location="All Garden Zones",
                    category="Gardening",
                    assigned_to=maintenance.user_id,
                    created_by=admin.user_id,
                ),
            ]
        )
    db.commit()
    print("  [create] Staff operations, inventory and roster demo data ready.")
