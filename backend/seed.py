"""
seed.py — Seed the database with roles and a super-admin user.

Usage:
    python seed.py

This script is idempotent — safe to run multiple times.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()

# Ensure the backend directory is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal  # noqa: E402
from app.db.models import User, Role, UserRole, RoleName  # noqa: E402
from app.auth.password import hash_password  # noqa: E402

# ─── Configuration ────────────────────────────────────────────────────────────
SUPER_ADMIN = {
    "first_name": "Super",
    "last_name": "Admin",
    "email": "superadmin@societysync.com",
    "phone_number": "+910000000000",  # change before production
    "password": "ChangeMe@123",  # change immediately after first login
}


def seed_roles(db) -> dict[RoleName, Role]:
    """Insert all roles if they don't exist. Returns a name → Role mapping."""
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
            print(f"  [create] Role '{role_name.value}' created.")
    db.commit()
    return role_map


def seed_super_admin(db, role_map: dict[RoleName, Role]) -> User:
    """Create the super-admin user if they don't exist."""
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

    print(f"  [create] Super-admin created: {SUPER_ADMIN['email']}")
    print(f"           Default password: {SUPER_ADMIN['password']}")
    print("           ⚠️  Change this password immediately!")
    return user


def main():
    print("\n🌱 SocietySync — Database Seed")
    print("=" * 40)

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

        print("\n✅ Seed completed successfully.\n")
    except Exception as exc:
        db.rollback()
        print(f"\n❌ Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
