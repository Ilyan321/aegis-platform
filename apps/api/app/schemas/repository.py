import re
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RepositoryBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255, description="Repository slug, e.g. org/repo")
    clone_url: str = Field(..., min_length=1, max_length=512, description="Git clone HTTPS or SSH URL")
    default_branch: str = Field("main", min_length=1, max_length=100)
    github_repo_id: Optional[int] = Field(None, description="GitHub repository ID")

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[\w\.\-]+/[\w\.\-]+$", clean):
            raise ValueError("Repository name must be in the format 'owner/repo' (e.g. 'octocat/hello-world')")
        return clean

    @field_validator("clone_url")
    @classmethod
    def validate_clone_url(cls, v: str) -> str:
        clean = v.strip()
        if not (clean.startswith("https://") or clean.startswith("http://") or clean.startswith("git@") or clean.startswith("ssh://")):
            raise ValueError("Clone URL must start with 'https://', 'http://', or 'git@'")
        return clean


class RepositoryCreate(RepositoryBase):
    organization_id: Optional[uuid.UUID] = None
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
