from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit import IncidentAudit
from app.models.incident import Incident
from app.schemas.audit import IncidentAuditRead
from app.schemas.incident import IncidentRead, IncidentStatusUpdate

router = APIRouter()


@router.get("", response_model=List[IncidentRead], summary="List security incidents")
async def list_incidents(
    repository_id: Optional[uuid.UUID] = None,
    status: Optional[str] = Query(None, pattern=r"^(OPEN|RESOLVED|REGRESSION|DISMISSED)$"),
    severity: Optional[str] = Query(None, pattern=r"^(CRITICAL|HIGH|MEDIUM|LOW)$"),
    verification_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Incident)
    if repository_id:
        stmt = stmt.where(Incident.repository_id == repository_id)
    if status:
        stmt = stmt.where(Incident.status == status)
    if severity:
        stmt = stmt.where(Incident.severity == severity)
    if verification_status:
        stmt = stmt.where(Incident.verification_status == verification_status)

    stmt = stmt.offset(skip).limit(limit).order_by(Incident.last_seen_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{incident_id}", response_model=IncidentRead, summary="Get incident by ID")
async def get_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentRead, summary="Triage / dismiss incident")
async def update_incident_status(
    incident_id: uuid.UUID,
    status_update: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    old_status = incident.status
    incident.status = status_update.status
    now = datetime.now(timezone.utc)

    if status_update.status in ("RESOLVED", "DISMISSED"):
        incident.resolved_at = now
    elif status_update.status == "OPEN":
        incident.resolved_at = None

    # Record append-only audit trail
    audit = IncidentAudit(
        incident_id=incident.id,
        actor_id=status_update.actor_id,
        action=f"STATUS_CHANGE_{status_update.status}",
        previous_state={"status": old_status},
        new_state={"status": status_update.status, "reason": status_update.reason},
        created_at=now,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(incident)
    return incident


@router.get("/{incident_id}/audits", response_model=List[IncidentAuditRead], summary="Get incident audit history")
async def get_incident_audits(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(IncidentAudit)
        .where(IncidentAudit.incident_id == incident_id)
        .order_by(IncidentAudit.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
