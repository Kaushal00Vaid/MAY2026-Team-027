import enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.db.database import Base


class OTPPurpose(str, enum.Enum):
    login = "login"
    signup_verify = "signup_verify"
    password_reset = "password_reset"


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    phone_number = Column(String(20), nullable=False, index=True)
    otp_code_hash = Column(Text, nullable=False)
    purpose = Column(SAEnum(OTPPurpose, name="otppurpose"), nullable=False, default=OTPPurpose.login)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, nullable=False, server_default="0")
    is_used = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
