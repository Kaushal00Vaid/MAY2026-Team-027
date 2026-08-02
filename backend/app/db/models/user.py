from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Identity
    first_name = Column(String(75), nullable=False)
    last_name = Column(String(75), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)  # nullable: phone-only signup
    phone_number = Column(String(20), unique=True, index=True, nullable=False)

    # Auth
    password_hash = Column(Text, nullable=True)  # nullable: OTP-only users

    # Profile — optional fields
    profile_picture_url = Column(Text, nullable=True)
    flat_number = Column(String(20), nullable=True)
    building_block = Column(String(50), nullable=True)
    staff_type = Column(String(100), nullable=True)
    emergency_contact = Column(String(20), nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, server_default="true")
    is_phone_verified = Column(Boolean, nullable=False, server_default="false")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    roles = relationship(
        "UserRole",
        back_populates="user",
        foreign_keys="[UserRole.user_id]",
        cascade="all, delete-orphan",
    )
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
