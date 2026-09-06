from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.incident import Incident
from app.models.repository import Repository
from app.models.scan_run import ScanRun
from app.models.user import User
from app.schemas.telemetry import DashboardTelemetry

router = APIRouter()


@router.get("", response_model=DashboardTelemetry, summary="Get high-level dashboard telemetry")
async def get_dashboard_telemetry(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_org_id = current_user.organization_id

    # 1. Total Repositories
    repos_stmt = select(func.count(Repository.id))
    if target_org_id:
        repos_stmt = repos_stmt.where(Repository.organization_id == target_org_id)
    repos_count = (await db.execute(repos_stmt)).scalar_one() or 0

    # 2. Total Scans
    scans_stmt = select(func.count(ScanRun.id))
    if target_org_id:
        scans_stmt = scans_stmt.join(Repository, ScanRun.repository_id == Repository.id).where(
            Repository.organization_id == target_org_id
        )
    scans_count = (await db.execute(scans_stmt)).scalar_one() or 0

    # Helper for incident queries
    def base_incident_stmt(conditions=None):
        stmt = select(func.count(Incident.id)).join(
            Repository, Incident.repository_id == Repository.id
        )
        if target_org_id:
            stmt = stmt.where(Repository.organization_id == target_org_id)
        if conditions:
            for cond in conditions:
                stmt = stmt.where(cond)
        return stmt

    # 3. Total Incidents
    incidents_count = (await db.execute(base_incident_stmt())).scalar_one() or 0

    # 4. Active Leaks (CRITICAL confirmed valid tokens)
    active_leaks = (
        await db.execute(base_incident_stmt([Incident.verification_status == "ACTIVE"]))
    ).scalar_one() or 0

    # 5. Resolved count
    resolved_count = (
        await db.execute(base_incident_stmt([Incident.status.in_(["RESOLVED", "DISMISSED"])]))
    ).scalar_one() or 0

    # 6. Severity breakdown
    critical_count = (
        await db.execute(
            base_incident_stmt([Incident.severity == "CRITICAL", Incident.status == "OPEN"])
        )
    ).scalar_one() or 0

    high_count = (
        await db.execute(
            base_incident_stmt([Incident.severity == "HIGH", Incident.status == "OPEN"])
        )
    ).scalar_one() or 0

    medium_count = (
        await db.execute(
            base_incident_stmt([Incident.severity == "MEDIUM", Incident.status == "OPEN"])
        )
    ).scalar_one() or 0

    low_count = (
        await db.execute(
            base_incident_stmt([Incident.severity == "LOW", Incident.status == "OPEN"])
        )
    ).scalar_one() or 0

    # 7. Recent incidents
    recent_incidents_stmt = select(Incident).join(
        Repository, Incident.repository_id == Repository.id
    )
    if target_org_id:
        recent_incidents_stmt = recent_incidents_stmt.where(
            Repository.organization_id == target_org_id
        )
    recent_incidents_stmt = (
        recent_incidents_stmt.order_by(Incident.last_seen_at.desc()).limit(10)
    )
    recent_incidents = (await db.execute(recent_incidents_stmt)).scalars().all()

    # 8. Recent scans
    recent_scans_stmt = select(ScanRun).join(
        Repository, ScanRun.repository_id == Repository.id
    )
    if target_org_id:
        recent_scans_stmt = recent_scans_stmt.where(
            Repository.organization_id == target_org_id
        )
    recent_scans_stmt = (
        recent_scans_stmt.order_by(ScanRun.created_at.desc()).limit(10)
    )
    recent_scans = (await db.execute(recent_scans_stmt)).scalars().all()

    # 9. Dynamic MTTR calculation (Mean Time to Remediate in hours)
    mttr_stmt = (
        select(
            func.avg(
                func.extract("epoch", Incident.resolved_at - Incident.first_seen_at) / 3600.0
            )
        )
        .join(Repository, Incident.repository_id == Repository.id)
        .where(
            Incident.status.in_(["RESOLVED", "DISMISSED"]),
            Incident.resolved_at.is_not(None),
        )
    )
    if target_org_id:
        mttr_stmt = mttr_stmt.where(Repository.organization_id == target_org_id)

    mttr_val = (await db.execute(mttr_stmt)).scalar_one_or_none()
    mttr_hours = round(float(mttr_val), 1) if mttr_val is not None and mttr_val > 0 else 0.0

    return DashboardTelemetry(
        total_repositories=repos_count,
        total_scans=scans_count,
        total_incidents=incidents_count,
        active_leaks=active_leaks,
        resolved_incidents=resolved_count,
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        mean_time_to_remediate_hours=mttr_hours,
        recent_incidents=recent_incidents,
        recent_scans=recent_scans,
    )


