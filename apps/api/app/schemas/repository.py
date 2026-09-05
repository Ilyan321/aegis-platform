import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RepositoryBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255, description="Repository slug, e.g. org/repo")
    clone_url: str = Field(..., min_length=1, max_length=512, description="Git clone HTTPS or SSH URL")
    default_branch: str = Field("main", min_length=1, max_length=100)
    github_repo_id: Optional[int] = Field(None, description="GitHub repository ID")


class RepositoryCreate(RepositoryBase):
    organization_id: uuid.UUID
    webhook_secret: Optional[str] = Field(None, description="Secret used to validate HMAC on incoming webhooks")


class RepositoryUpdate(BaseModel):
    default_branch: Optional[str] = Field(None, max_length=100)
    webhook_secret: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class RepositoryRead(RepositoryBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # We do NOT leak the webhook_secret in standard read schemas

    model_config = ConfigDict(from_attributes=True)
