import re
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator


# Signup

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone_number: str
    password: Optional[str] = None
    confirm_password: Optional[str] = None
    # Optional profile fields
    profile_picture_url: Optional[str] = None
    flat_number: Optional[str] = None
    building_block: Optional[str] = None
    staff_type: Optional[str] = None
    emergency_contact: Optional[str] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 75:
            raise ValueError("Name must be 75 characters or fewer")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\+?[1-9]\d{7,14}$", v):
            raise ValueError(
                "Invalid phone number. Use international format e.g. +919876543210"
            )
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupRequest":
        if self.password and self.confirm_password:
            if self.password != self.confirm_password:
                raise ValueError("Passwords do not match")
        return self


# Password login

class PasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str


# OTP

class OTPRequestSchema(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\+?[1-9]\d{7,14}$", v):
            raise ValueError(
                "Invalid phone number. Use international format e.g. +919876543210"
            )
        return v


class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp_code: str

    @field_validator("otp_code")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("OTP must be a 6-digit number")
        return v


# Token responses

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


# User responses

class UserMeResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: Optional[str]
    phone_number: Optional[str]
    profile_picture_url: Optional[str]
    flat_number: Optional[str]
    building_block: Optional[str]
    staff_type: Optional[str]
    emergency_contact: Optional[str]
    is_active: bool
    is_phone_verified: bool
    is_profile_complete: bool
    google_id: Optional[str]
    roles: list[str]
    created_at: str

    model_config = {"from_attributes": True}


class SignupResponse(BaseModel):
    message: str
    user_id: int
    phone_number: str


# Google OAuth

class CompleteProfileRequest(BaseModel):
    phone_number: str
    first_name: str
    last_name: str
    flat_number: Optional[str] = None
    building_block: Optional[str] = None
    emergency_contact: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\+?[1-9]\d{7,14}$", v):
            raise ValueError(
                "Invalid phone number. Use international format e.g. +919876543210"
            )
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 75:
            raise ValueError("Name must be 75 characters or fewer")
        return v
