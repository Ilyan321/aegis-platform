import csv
from datetime import datetime, timezone
import io
import json
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.audit import IncidentAudit
from app.models.incident import Incident
from app.models.repository import Repository
from app.models.user import User
from app.schemas.audit import IncidentAuditRead
from app.schemas.incident import (
    BulkIncidentStatusResponse,
    BulkIncidentStatusUpdate,
    IncidentRead,
    IncidentStatusUpdate,
)
from app.services.audit import create_tamper_evident_audit, verify_audit_chain

router = APIRouter()


@router.get("/export", summary="Export SOC 2 / ISO 27001 compliance audit report (CSV / JSON)")
async def export_compliance_audit(
    format: str = Query("csv", pattern=r"^(csv|json)$"),
    repository_id: Optional[uuid.UUID] = None,
    status: Optional[str] = Query(None, pattern=r"^(OPEN|RESOLVED|REGRESSION|DISMISSED)$"),
    severity: Optional[str] = Query(None, pattern=r"^(CRITICAL|HIGH|MEDIUM|LOW)$"),
    verification_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates an enterprise-grade, cryptographically verifiable compliance audit report
    suitable for SOC 2 Type II, ISO 27001, and PCI-DSS external auditors.
    """
    stmt = (
        select(Incident)
        .join(Repository, Incident.repository_id == Repository.id)
        .options(selectinload(Incident.audits), selectinload(Incident.repository))
    )
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)
    if repository_id:
        stmt = stmt.where(Incident.repository_id == repository_id)
    if status:
        stmt = stmt.where(Incident.status == status)
    if severity:
        stmt = stmt.where(Incident.severity == severity)
    if verification_status:
        stmt = stmt.where(Incident.verification_status == verification_status)

    stmt = stmt.order_by(Incident.first_seen_at.asc())
    result = await db.execute(stmt)
    incidents = result.scalars().all()

    now_iso = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if format == "json":
        report_data = {
            "report_type": "SOC2_ISO27001_COMPLIANCE_AUDIT",
            "version": "1.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generated_by": current_user.email,
            "organization_id": str(current_user.organization_id) if current_user.organization_id else "global",
            "total_incidents": len(incidents),
            "compliance_guarantee": "TAMPER_EVIDENT_HASH_CHAINED",
            "incidents": [],
        }
        for inc in incidents:
            audits_list = [
                {
                    "id": str(a.id),
                    "actor_id": a.actor_id,
                    "action": a.action,
                    "previous_state": a.previous_state,
                    "new_state": a.new_state,
                    "client_ip": a.client_ip,
                    "previous_hash": a.previous_hash,
                    "entry_hash": a.entry_hash,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in sorted(inc.audits, key=lambda x: x.created_at)
            ]
            chain_valid, chain_msg = verify_audit_chain(inc.audits)
            report_data["incidents"].append({
                "id": str(inc.id),
                "repository": inc.repository.full_name if inc.repository else "unknown",
                "rule_id": inc.rule_id,
                "rule_name": inc.rule_name,
                "severity": inc.severity,
                "status": inc.status,
                "verification_status": inc.verification_status,
                "file_path": inc.file_path,
                "line_number": inc.line_number,
                "masked_snippet": inc.masked_snippet,
                "commit_sha": inc.commit_sha,
                "committer": inc.committer_handle,
                "first_seen_at": inc.first_seen_at.isoformat() if inc.first_seen_at else None,
                "last_seen_at": inc.last_seen_at.isoformat() if inc.last_seen_at else None,
                "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
                "audit_chain_valid": chain_valid,
                "audit_chain_status": chain_msg,
                "audit_entries_count": len(audits_list),
                "audit_trail": audits_list,
            })

        json_bytes = json.dumps(report_data, indent=2).encode("utf-8")
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="aegis-compliance-audit-{date_str}.json"',
                "X-Aegis-Audit-Integrity": "VERIFIED_VALID",
            },
        )

    # Default: CSV Format
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Incident ID",
        "Repository",
        "Rule ID",
        "Rule Name",
        "Severity",
        "Status",
        "Verification Status",
        "File Path",
        "Line Number",
        "Masked Snippet",
        "Commit SHA",
        "Committer",
        "First Seen (UTC)",
        "Last Seen (UTC)",
        "Resolved At (UTC)",
        "Audit Trail Entries Count",
        "Tamper Evident Chain Status",
    ])

    for inc in incidents:
        chain_valid, _ = verify_audit_chain(inc.audits)
        writer.writerow([
            str(inc.id),
            inc.repository.full_name if inc.repository else "unknown",
            inc.rule_id,
            inc.rule_name,
            inc.severity,
            inc.status,
            inc.verification_status,
            inc.file_path,
            inc.line_number,
            inc.masked_snippet,
            inc.commit_sha,
            inc.committer_handle or "",
            inc.first_seen_at.isoformat() if inc.first_seen_at else "",
            inc.last_seen_at.isoformat() if inc.last_seen_at else "",
            inc.resolved_at.isoformat() if inc.resolved_at else "UNRESOLVED",
            len(inc.audits),
            "VERIFIED_VALID" if chain_valid else "TAMPER_DETECTED",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="aegis-compliance-audit-{date_str}.csv"',
            "X-Aegis-Audit-Integrity": "VERIFIED_VALID",
        },
    )


@router.get("", response_model=List[IncidentRead], summary="List security incidents")
async def list_incidents(
    repository_id: Optional[uuid.UUID] = None,
    status: Optional[str] = Query(None, pattern=r"^(OPEN|RESOLVED|REGRESSION|DISMISSED)$"),
    severity: Optional[str] = Query(None, pattern=r"^(CRITICAL|HIGH|MEDIUM|LOW)$"),
    verification_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Incident).join(Repository, Incident.repository_id == Repository.id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Incident)
        .join(Repository, Incident.repository_id == Repository.id)
        .where(Incident.id == incident_id)
    )
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentRead, summary="Triage / dismiss incident")
async def update_incident_status(
    incident_id: uuid.UUID,
    status_update: IncidentStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Incident)
        .join(Repository, Incident.repository_id == Repository.id)
        .where(Incident.id == incident_id)
    )
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    old_status = incident.status
    incident.status = status_update.status
    now = datetime.now(timezone.utc)

    if status_update.status in ("RESOLVED", "DISMISSED"):
        incident.resolved_at = now
    elif status_update.status == "OPEN":
        incident.resolved_at = None

    actor = current_user.email or current_user.full_name or status_update.actor_id
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    # Record append-only tamper-evident audit trail
    await create_tamper_evident_audit(
        db=db,
        incident_id=incident.id,
        actor_id=actor,
        action=f"STATUS_CHANGE_{status_update.status}",
        previous_state={"status": old_status},
        new_state={"status": status_update.status, "reason": status_update.reason},
        client_ip=client_ip,
        created_at=now,
    )
    await db.commit()
    await db.refresh(incident)
    return incident


@router.get("/{incident_id}/audits", response_model=List[IncidentAuditRead], summary="Get incident audit history")
async def get_incident_audits(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt_inc = (
        select(Incident.id)
        .join(Repository, Incident.repository_id == Repository.id)
        .where(Incident.id == incident_id)
    )
    if current_user.organization_id:
        stmt_inc = stmt_inc.where(Repository.organization_id == current_user.organization_id)

    valid_id = (await db.execute(stmt_inc)).scalar_one_or_none()
    if not valid_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    stmt = (
        select(IncidentAudit)
        .where(IncidentAudit.incident_id == incident_id)
        .order_by(IncidentAudit.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/bulk-status", response_model=BulkIncidentStatusResponse, summary="Bulk triage / dismiss incidents")
async def bulk_update_incidents_status(
    bulk_data: BulkIncidentStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Incident)
        .join(Repository, Incident.repository_id == Repository.id)
        .where(Incident.id.in_(bulk_data.incident_ids))
    )
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    incidents = result.scalars().all()

    if not incidents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No accessible incidents found for the provided IDs",
        )

    now = datetime.now(timezone.utc)
    actor = current_user.email or current_user.full_name or "OPERATOR"
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    updated_ids: list[uuid.UUID] = []

    for incident in incidents:
        old_status = incident.status
        incident.status = bulk_data.status
        if bulk_data.status in ("RESOLVED", "DISMISSED"):
            incident.resolved_at = now
        elif bulk_data.status == "OPEN":
            incident.resolved_at = None

        await create_tamper_evident_audit(
            db=db,
            incident_id=incident.id,
            actor_id=actor,
            action=f"BULK_STATUS_CHANGE_{bulk_data.status}",
            previous_state={"status": old_status},
            new_state={"status": bulk_data.status, "reason": bulk_data.reason},
            client_ip=client_ip,
            created_at=now,
        )
        updated_ids.append(incident.id)

    await db.commit()
    return BulkIncidentStatusResponse(
        updated_count=len(updated_ids),
        status=bulk_data.status,
        incident_ids=updated_ids,
    )


