import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    repository_id: uuid.UUID
    scan_run_id: Optional[uuid.UUID] = None
    rule_id: str
    rule_name: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    status: str = "OPEN"  # OPEN, RESOLVED, REGRESSION
    verification_status: str = "NOT_VERIFIED"
    verification_details: Optional[str] = None
    file_path: str
    line_number: int
    masked_snippet: str
    commit_sha: str
    committer_handle: Optional[str] = None


class IncidentRead(IncidentBase):
    id: uuid.UUID
    fingerprint: str
    secret_hash: str
    first_seen_at: datetime
    last_seen_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(OPEN|RESOLVED|DISMISSED)$")
    actor_id: str = Field("OPERATOR", min_length=1, max_length=255)
    reason: Optional[str] = None


class BulkIncidentStatusUpdate(BaseModel):
    incident_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=500)
    status: str = Field(..., pattern=r"^(OPEN|RESOLVED|DISMISSED)$")
    reason: Optional[str] = None


class BulkIncidentStatusResponse(BaseModel):
    updated_count: int
    status: str
    incident_ids: list[uuid.UUID]

