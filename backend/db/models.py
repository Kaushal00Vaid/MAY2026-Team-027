import enum
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    Text, 
    BigInteger, 
    SmallInteger, 
    ForeignKey, 
    DateTime, 
    Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class RoleName(str, enum.Enum):
    admin = 'admin'
    committee_member = 'committee_member'
    flat_owner = 'flat_owner'
    resident_rental = 'resident_rental'
    support_staff = 'support_staff'

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(SmallInteger, primary_key=True)
    role_name = Column(Enum(RoleName), unique=True, nullable=False)

    # Relationship back to the association table
    users = relationship("UserRole", back_populates="role")

class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(SmallInteger, ForeignKey("roles.role_id"), primary_key=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships to the parent models
    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")

class User(Base):
    __tablename__ = "users"

    user_id = Column(BigInteger, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False) 
    phone_number = Column(String(20), unique=True, nullable=False)
    whatsapp_number = Column(String(20), nullable=False)
    password_hash = Column(Text, nullable=False)
    
    # We will assume Flats table will be created later. 
    # flat_id = Column(BigInteger, ForeignKey("flats.flat_id", ondelete="SET NULL"), nullable=True)
    
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship back to the association table
    roles = relationship("UserRole", back_populates="user")
    
    # Placeholder for Flat relationship once we build that model
    # flat = relationship("Flat", back_populates="users")