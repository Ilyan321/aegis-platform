import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import IncidentAudit

logger = logging.getLogger("aegis.audit")

GENESIS_PREVIOUS_HASH = "0" * 64


def _canonical_timestamp(dt: Optional[datetime | str]) -> str:
    if not dt:
        return ""
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def compute_audit_hash(
    incident_id: str,
    actor_id: str,
    action: str,
    previous_state: Optional[Dict[str, Any]],
    new_state: Optional[Dict[str, Any]],
    client_ip: Optional[str],
    timestamp: datetime | str,
    previous_hash: str,
) -> str:
    """
    Computes a cryptographic SHA-256 digest linking the current audit event
    to its prior state and the preceding entry hash in the audit chain.
    """
    ts_str = _canonical_timestamp(timestamp)
    payload = {
        "incident_id": str(incident_id),
        "actor_id": str(actor_id),
        "action": str(action),
        "previous_state": previous_state or {},
        "new_state": new_state or {},
        "client_ip": client_ip or "",
        "timestamp": ts_str,
        "previous_hash": previous_hash,
    }
    canonical_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical_bytes).hexdigest()


async def create_tamper_evident_audit(
    db: AsyncSession,
    incident_id: uuid.UUID,
    actor_id: str,
    action: str,
    previous_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None,
    client_ip: Optional[str] = None,
    created_at: Optional[datetime] = None,
) -> IncidentAudit:
    """
    Creates an immutable, cryptographically chained audit log entry for an incident.
    Fetches the latest audit entry for this incident to establish previous_hash chaining.
    """
    now = created_at or datetime.now(timezone.utc)

    # Find the most recent audit entry for this incident
    stmt = (
        select(IncidentAudit)
        .where(IncidentAudit.incident_id == incident_id)
        .order_by(IncidentAudit.created_at.desc())
        .limit(1)
    )
    latest_entry = (await db.execute(stmt)).scalar_one_or_none()
    previous_hash = latest_entry.entry_hash if (latest_entry and latest_entry.entry_hash) else GENESIS_PREVIOUS_HASH

    entry_hash = compute_audit_hash(
        incident_id=str(incident_id),
        actor_id=actor_id,
        action=action,
        previous_state=previous_state,
        new_state=new_state,
        client_ip=client_ip,
        timestamp=now,
        previous_hash=previous_hash,
    )

    audit = IncidentAudit(
        incident_id=incident_id,
        actor_id=actor_id,
        action=action,
        previous_state=previous_state,
        new_state=new_state,
        client_ip=client_ip,
        previous_hash=previous_hash,
        entry_hash=entry_hash,
        created_at=now,
    )
    db.add(audit)
    return audit


def verify_audit_chain(audits: List[IncidentAudit]) -> tuple[bool, str]:
    """
    Validates cryptographic tamper-evidence of an ordered list of audit entries (oldest to newest).
    """
    if not audits:
        return True, "Chain is empty; valid."

    expected_prev = GENESIS_PREVIOUS_HASH
    for idx, entry in enumerate(audits):
        if entry.previous_hash and entry.previous_hash != expected_prev and idx != 0:
            return False, f"Broken previous_hash pointer at audit index {idx} (ID: {entry.id})"

        expected_hash = compute_audit_hash(
            incident_id=str(entry.incident_id),
            actor_id=entry.actor_id,
            action=entry.action,
            previous_state=entry.previous_state,
            new_state=entry.new_state,
            client_ip=entry.client_ip,
            timestamp=entry.created_at,
            previous_hash=entry.previous_hash or GENESIS_PREVIOUS_HASH,
        )

        if entry.entry_hash and entry.entry_hash != expected_hash:
            return False, f"Hash mismatch at audit index {idx} (ID: {entry.id}). Computed: {expected_hash}, Stored: {entry.entry_hash}"

        if entry.entry_hash:
            expected_prev = entry.entry_hash

    return True, "Audit chain integrity successfully verified."
