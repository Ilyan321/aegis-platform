import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ScanRunBase(BaseModel):
    repository_id: uuid.UUID
    commit_sha: str = Field(..., min_length=1, max_length=64)
    branch: str = Field(..., max_length=255)
    trigger_source: str = Field("webhook", max_length=50)


class ScanRunCreate(ScanRunBase):
    status: str = "QUEUED"


class ScanRunRead(ScanRunBase):
    id: uuid.UUID
    status: str
    files_scanned: int
    total_findings: int
    active_leaks_count: int
    duration_ms: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
