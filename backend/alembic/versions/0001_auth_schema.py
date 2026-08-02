"""Initial auth schema

Revision ID: 0001
Revises:
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enums
    rolename_enum = sa.Enum(
        "super_admin", "admin", "committee_member",
        "flat_owner", "resident_rental", "support_staff",
        name="rolename",
    )
    otppurpose_enum = sa.Enum(
        "login", "signup_verify", "password_reset",
        name="otppurpose",
    )

    # Users
    op.create_table(
        "users",
        sa.Column("user_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("first_name", sa.String(75), nullable=False),
        sa.Column("last_name", sa.String(75), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone_number", sa.String(20), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("profile_picture_url", sa.Text(), nullable=True),
        sa.Column("flat_number", sa.String(20), nullable=True),
        sa.Column("building_block", sa.String(50), nullable=True),
        sa.Column("staff_type", sa.String(100), nullable=True),
        sa.Column("emergency_contact", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_phone_verified", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_index("ix_users_user_id", "users", ["user_id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=True)

    # Roles
    op.create_table(
        "roles",
        sa.Column("role_id", sa.SmallInteger(), nullable=False),
        sa.Column("role_name", rolename_enum, nullable=False),
        sa.PrimaryKeyConstraint("role_id"),
        sa.UniqueConstraint("role_name"),
    )

    # User Roles (association)
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.SmallInteger(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("assigned_by", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["role_id"], ["roles.role_id"]),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.user_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["assigned_by"], ["users.user_id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )

    # OTP Records
    op.create_table(
        "otp_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("phone_number", sa.String(20), nullable=False),
        sa.Column("otp_code_hash", sa.Text(), nullable=False),
        sa.Column("purpose", otppurpose_enum, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_used", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_otp_records_phone_number", "otp_records", ["phone_number"])

    # Refresh Tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.user_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("otp_records")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("users")

    # Drop custom enums
    sa.Enum(name="rolename").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="otppurpose").drop(op.get_bind(), checkfirst=True)
