from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.dependencies import get_current_user
from app.operations import service
from app.operations.schemas import (
    ItemCreate,
    MovementCreate,
    ShiftCreate,
    ShiftStatus,
    TaskCreate,
    TaskUpdate,
)

router = APIRouter()


@router.get("/staff")
def staff(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.staff_users(db, user)


@router.get("/tasks")
def tasks(
    task_status: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.list_tasks(db, user, task_status)


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_task(db, user, data)


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_task(db, user, task_id, data)


@router.get("/inventory")
def inventory(
    search: str | None = Query(None, max_length=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.list_inventory(db, user, search)


@router.post("/inventory", status_code=status.HTTP_201_CREATED)
def create_item(
    data: ItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_item(db, user, data)


@router.post("/inventory/{item_id}/movements")
def movement(
    item_id: int,
    data: MovementCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.movement(db, user, item_id, data)


@router.get("/inventory-options")
def options(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_units_vendors(db, user)


@router.get("/inventory-export")
def inventory_export(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    items = service.list_inventory(db, user)
    content = service.csv_export(
        ["Item", "Category", "Quantity", "Unit", "Status"],
        [
            (x["name"], x["category"], x["quantity"], x["unit"], x["status"])
            for x in items
        ],
    )
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="inventory.csv"'},
    )


@router.get("/shifts")
def shifts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_shifts(db, user)


@router.post("/shifts", status_code=status.HTTP_201_CREATED)
def create_shift(
    data: ShiftCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_shift(db, user, data)


@router.patch("/shifts/{shift_id}/status")
def shift_status(
    shift_id: int,
    data: ShiftStatus,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.shift_status(db, user, shift_id, data)


@router.get("/shifts/export")
def shifts_export(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    items = service.list_shifts(db, user)
    content = service.csv_export(
        ["Staff", "Role", "Start", "End", "Days mask", "Status"],
        [
            (
                x["staff_name"],
                x["role_label"],
                x["start_time"],
                x["end_time"],
                x["days_mask"],
                x["status"],
            )
            for x in items
        ],
    )
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="staff-roster.csv"'},
    )


@router.get("/attendance/today")
def attendance_today(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return service.attendance_today(db, user)


@router.post("/attendance/toggle")
def attendance_toggle(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return service.toggle_attendance(db, user)
