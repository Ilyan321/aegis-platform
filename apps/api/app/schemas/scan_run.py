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


class CliScanFinding(BaseModel):
    id: str
    rule_id: str
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    file_path: str
    line_number: int = 0
    masked_value: str
    severity: str = "HIGH"
    confidence: Optional[str] = "HIGH"
    verification: Optional[dict] = None


class CliScanPayload(BaseModel):
    repository_name: Optional[str] = None
    clone_url: Optional[str] = None
    commit_sha: Optional[str] = "LOCAL_DEV"
    branch: Optional[str] = "local"
    version: Optional[str] = "1.0.0"
    scan_target: Optional[str] = "."
    scan_type: Optional[str] = "path"
    timestamp: Optional[str] = None
    duration_ms: int = 0
    total_files_scanned: int = 0
    total_lines_scanned: int = 0
    total_findings: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    active_leaks_count: int = 0
    findings: list[CliScanFinding] = Field(default_factory=list)
    findings_hash: Optional[str] = ""


class CliScanResponse(BaseModel):
    scan_run_id: uuid.UUID
    repository_id: uuid.UUID
    repository_name: str
    status: str = "synced"
    incidents_recorded: int
    active_leaks: int
    message: str

