import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Organization display name")
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$", description="URL-friendly slug")


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class OrganizationRead(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationSettingsRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationSettingsUpdate(BaseModel):
    slack_webhook_url: Optional[str] = Field(None, max_length=512)
    discord_webhook_url: Optional[str] = Field(None, max_length=512)


class TestAlertRequest(BaseModel):
    channel: str = Field("slack", pattern=r"^(slack|discord)$")

