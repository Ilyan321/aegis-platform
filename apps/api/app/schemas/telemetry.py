from typing import List, Optional
from pydantic import BaseModel
from app.schemas.incident import IncidentRead
from app.schemas.scan_run import ScanRunRead


class DashboardTelemetry(BaseModel):
    total_repositories: int = 0
    total_scans: int = 0
    total_incidents: int = 0
    active_leaks: int = 0
    resolved_incidents: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    mean_time_to_remediate_hours: float = 0.0
    recent_incidents: List[IncidentRead] = []
    recent_scans: List[ScanRunRead] = []
