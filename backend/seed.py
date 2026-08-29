"""
seed.py — Seed the database with roles and a super-admin user.

Usage:
    python seed.py
    # or with uv:
    uv run python seed.py

This script is idempotent — safe to run multiple times on both SQLite3 and PostgreSQL.
Assumes database schema has already been created (e.g., via `alembic upgrade head`).
"""

import datetime
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import event, func, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

load_dotenv()

# Ensure the backend directory is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal, engine  # noqa: E402
from app.db.models import User, Role, UserRole, RoleName  # noqa: E402
from app.auth.password import hash_password  # noqa: E402


# ─── SQLite Compatibility Listeners ───────────────────────────────────────────
@event.listens_for(Engine, "connect")
def register_sqlite_functions(dbapi_connection, connection_record):
    """Register PostgreSQL-compatible SQL functions (like now()) in SQLite."""
    if hasattr(dbapi_connection, "create_function"):
        dbapi_connection.create_function(
            "now",
            0,
            lambda: datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )


@event.listens_for(Session, "before_flush")
def auto_assign_sqlite_primary_keys(session, flush_context, instances):
    """
    Auto-assign missing integer primary keys for SQLite inserts across all seed modules.
    Required because SQLite only autoincrements exact 'INTEGER PRIMARY KEY' DDL columns.
    """
    if session.bind and session.bind.dialect.name == "sqlite":
        assigned_max = {}
        for obj in list(session.new):
            mapper = inspect(obj.__class__)
            for pk_col in mapper.primary_key:
                try:
                    is_int = issubclass(pk_col.type.python_type, int)
                except (AttributeError, NotImplementedError, TypeError):
                    is_int = False

                if is_int:
                    prop = mapper.get_property_by_column(pk_col)
                    attr_name = prop.key
                    if getattr(obj, attr_name) is None:
                        col_key = (mapper.mapped_table.name, pk_col.name)
                        if col_key not in assigned_max:
                            max_val = session.query(func.max(pk_col)).scalar() or 0
                            assigned_max[col_key] = max_val
                        assigned_max[col_key] += 1
                        setattr(obj, attr_name, assigned_max[col_key])


# ─── Configuration ────────────────────────────────────────────────────────────
SUPER_ADMIN = {
    "first_name": "Super",
    "last_name": "Admin",
    "email": "superadmin@societysync.com",
    "phone_number": "+910000000000",  # change before production
    "password": "ChangeMe@123",  # change immediately after first login
}


def sync_postgres_sequences(db, table_name: str, pk_column: str) -> None:
    """Reset PostgreSQL auto-increment sequence after explicit primary key insertion."""
    if db.bind.dialect.name == "postgresql":
        try:
            db.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('{table_name}', '{pk_column}'), "
                    f"COALESCE((SELECT MAX({pk_column}) FROM {table_name}), 1));"
                )
            )
            db.commit()
            print(f"  [pg-sync] Reset {table_name}_{pk_column}_seq sequence.")
        except Exception as err:
            db.rollback()
            print(f"  [pg-sync warning] Failed to sync PostgreSQL sequence for {table_name}: {err}")


def seed_roles(db) -> dict[RoleName, Role]:
    """Insert all roles if they don't exist. Returns a name -> Role mapping."""
    role_map: dict[RoleName, Role] = {}
    
    for idx, role_name in enumerate(RoleName, start=1):
        existing = db.query(Role).filter(Role.role_name == role_name).first()
        if existing:
            role_map[role_name] = existing
            print(f"  [skip]   Role '{role_name.value}' already exists.")
        else:
            role = Role(role_id=idx, role_name=role_name)
            db.add(role)
            db.flush()
            role_map[role_name] = role
            print(f"  [create] Role '{role_name.value}' created (ID: {idx}).")
            
    db.commit()
    sync_postgres_sequences(db, "roles", "role_id")
    
    return role_map


def seed_super_admin(db, role_map: dict[RoleName, Role]) -> User:
    """Create the super-admin user if they don't exist."""
    if db.bind.dialect.name == "sqlite":
        db.execute(text("UPDATE users SET is_active = 1 WHERE typeof(is_active) = 'text' AND is_active IN ('true', '1')"))
        db.commit()

    existing = db.query(User).filter(User.email == SUPER_ADMIN["email"]).first()
    if existing:
        print(f"  [skip]   Super-admin '{SUPER_ADMIN['email']}' already exists.")
        return existing

    user = User(
        first_name=SUPER_ADMIN["first_name"],
        last_name=SUPER_ADMIN["last_name"],
        email=SUPER_ADMIN["email"],
        phone_number=SUPER_ADMIN["phone_number"],
        password_hash=hash_password(SUPER_ADMIN["password"]),
        is_active=True,
        is_phone_verified=True,
    )
    db.add(user)
    db.flush()

    user_role = UserRole(
        user_id=user.user_id,
        role_id=role_map[RoleName.super_admin].role_id,
    )
    db.add(user_role)
    db.commit()

    sync_postgres_sequences(db, "users", "user_id")

    print(f"  [create] Super-admin created: {SUPER_ADMIN['email']}")
    print(f"           Default password: {SUPER_ADMIN['password']}")
    print("           ⚠️  Change this password immediately!")
    return user


def main():
    dialect_name = engine.dialect.name
    print("\n🌱 SocietySync — Database Seed")
    print("=" * 40)
    print(f"📊 Active Database Engine: {dialect_name.upper()}")

    # Enable SQLite foreign key enforcement
    if dialect_name == "sqlite":
        with engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON;"))

    db = SessionLocal()
    try:
        print("\n📋 Seeding roles...")
        role_map = seed_roles(db)

        print("\n👤 Seeding super-admin...")
        admin = seed_super_admin(db, role_map)

        print("\n🛠️  Seeding Helpdesk demo data...")
        from app.helpdesk.seed import seed_helpdesk
        seed_helpdesk(db, role_map, admin)

        print("\n🏘️  Seeding Community demo data...")
        from app.community.seed import seed_community
        seed_community(db, admin)

        print("\n🛡️  Seeding Security demo data...")
        from app.security.seed import seed_security
        seed_security(db, role_map)

        print("\n💳 Seeding Finance demo data...")
        from app.finance.seed import seed_finance
        seed_finance(db)

        print("\n🏊 Seeding Amenities demo data...")
        from app.amenities.seed import seed_amenities
        seed_amenities(db, admin)

        print("\n📦 Seeding Staff Operations demo data...")
        from app.operations.seed import seed_operations
        seed_operations(db, admin)

        print("\n🔔 Seeding Realtime demo notifications...")
        from app.realtime.seed import seed_realtime
        seed_realtime(db)

        print("\n✅ Seed completed successfully.\n")
    except Exception as exc:
        db.rollback()
        print(f"\n❌ Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()