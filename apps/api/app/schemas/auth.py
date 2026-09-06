import re
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[\w\-]+\.[\w\.\-]+$")


class UserRegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = Field(None, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format")
        return clean


class UserLoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: str
    organization_id: Optional[UUID] = None
    has_github_token: bool = False
    is_verified: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    email: str = Field(..., max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        clean = v.strip()
        if not clean.isdigit():
            raise ValueError("Verification code must be exactly 6 numeric digits")
        return clean


class ResendOtpRequest(BaseModel):
    email: str = Field(..., max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format")
        return clean


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16, max_length=255)
    new_password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class MessageResponse(BaseModel):
    message: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

