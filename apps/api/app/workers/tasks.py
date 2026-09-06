import asyncio
import json
import logging
import os
import shutil
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.crypto import (
    compute_blind_index,
    compute_incident_fingerprint,
    encrypt_secret,
)
from app.core.database import async_session_factory
from app.models.audit import IncidentAudit
from app.models.incident import Incident
from app.models.organization import Organization
from app.models.repository import Repository
from app.models.scan_run import ScanRun
from app.models.user import User
from app.services.notifications import (
    send_discord_scan_summary_alert,
    send_slack_incident_alert,
    send_slack_scan_summary_alert,
)

logger = logging.getLogger("aegis.worker")


def get_aegis_bin_path() -> str:
    """Resolves the executable path of the Aegis CLI binary."""
    # 1. Check explicit environment override
    env_bin = os.getenv("AEGIS_BIN_PATH")
    if env_bin and Path(env_bin).exists() and os.access(env_bin, os.X_OK):
        return env_bin

    # 2. Check current directory / apps/api/bin/aegis
    local_bin = Path(__file__).resolve().parent.parent.parent / "bin" / "aegis"
    if local_bin.exists() and os.access(local_bin, os.X_OK):
        return str(local_bin)

    # 3. Check /usr/local/bin/aegis
    usr_bin = Path("/usr/local/bin/aegis")
    if usr_bin.exists() and os.access(usr_bin, os.X_OK):
        return str(usr_bin)

    # 4. Fallback to PATH lookup
    path_bin = shutil.which("aegis")
    if path_bin:
        return path_bin

    # 5. Fallback to User Go bin
    user_go_bin = Path.home() / "go" / "bin" / "aegis"
    if user_go_bin.exists() and os.access(user_go_bin, os.X_OK):
        return str(user_go_bin)

    return "aegis"


async def execute_scan_workflow(
    scan_run_id: str,
    repository_id: str,
    clone_url: str,
    branch: str,
    commit_sha: str,
    committer_handle: Optional[str],
    delivery_guid: str,
) -> Dict[str, Any]:
    """
    Executes the end-to-end repository scan, state reconciliation,
    and incident notification workflow.
    """
    now = datetime.now(timezone.utc)
    scan_uuid = uuid.UUID(scan_run_id)
    repo_uuid = uuid.UUID(repository_id)

    async with async_session_factory() as db:
        # Fetch ScanRun & Repository
        scan_run = await db.get(ScanRun, scan_uuid)
        repository = await db.get(Repository, repo_uuid)

        if not scan_run or not repository:
            logger.error(f"ScanRun {scan_run_id} or Repository {repository_id} not found")
            return {"status": "error", "message": "Record not found"}

        # 1. Update status to RUNNING
        scan_run.status = "RUNNING"
        scan_run.started_at = now
        await db.commit()

        # 2. Idempotency check via Redis
        is_fresh = True
        try:
            r = redis.from_url(
                settings.REDIS_URL,
                ssl_cert_reqs=None,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
            )
            lock_key = f"lock:delivery:{delivery_guid}"
            is_fresh = r.set(lock_key, "1", ex=86400, nx=True)
        except Exception as e:
            logger.warning(f"Redis idempotency lock check failed, proceeding with scan: {e}")
            is_fresh = True

        if not is_fresh:
            logger.warning(f"Duplicate delivery {delivery_guid} ignored via atomic lock")
            scan_run.status = "COMPLETED"
            scan_run.error_message = "Duplicate delivery ignored"
            scan_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return {"status": "duplicate_skipped"}

        # 3. Isolated Shallow Clone
        # Validate clone_url and branch to prevent option injection
        if not clone_url or clone_url.startswith("-"):
            error_msg = f"Invalid or unsafe clone URL: {clone_url}"
            logger.error(error_msg)
            scan_run.status = "FAILED"
            scan_run.error_message = error_msg
            scan_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return {"status": "failed", "reason": error_msg}

        allowed_schemes = ("https://", "http://", "git@", "ssh://", "git://")
        if not any(clone_url.startswith(scheme) for scheme in allowed_schemes):
            error_msg = f"Unsupported git clone protocol for URL: {clone_url}"
            logger.error(error_msg)
            scan_run.status = "FAILED"
            scan_run.error_message = error_msg
            scan_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return {"status": "failed", "reason": error_msg}

        import re
        if not branch or branch.startswith("-") or not re.match(r"^[a-zA-Z0-9._/-]+$", branch):
            error_msg = f"Invalid or unsafe git branch ref: {branch}"
            logger.error(error_msg)
            scan_run.status = "FAILED"
            scan_run.error_message = error_msg
            scan_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return {"status": "failed", "reason": error_msg}

        temp_dir = Path(f"/tmp/aegis_scan_{delivery_guid}_{commit_sha[:8]}")
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Resolve GitHub OAuth token for private repository clone
        auth_token = None
        user_stmt = select(User).where(
            User.organization_id == repository.organization_id,
            User.github_access_token.is_not(None),
        ).limit(1)
        user_with_token = (await db.execute(user_stmt)).scalars().first()
        if user_with_token:
            auth_token = user_with_token.get_github_token()

        # Inject credentials into GitHub clone URL if available
        auth_clone_url = clone_url
        if auth_token and "github.com" in clone_url and "@" not in clone_url:
            auth_clone_url = clone_url.replace("https://github.com", f"https://x-access-token:{auth_token}@github.com")

        try:
            logger.info(f"Cloning {clone_url} (branch {branch}) to {temp_dir}...")
            clone_cmd = [
                "git",
                "clone",
                "--depth=1",
                "--branch",
                branch,
                "--",
                auth_clone_url,
                str(temp_dir),
            ]
            clone_env = os.environ.copy()
            clone_env["GIT_TERMINAL_PROMPT"] = "0"
            clone_proc = subprocess.run(
                clone_cmd,
                capture_output=True,
                text=True,
                timeout=90,
                env=clone_env,
            )
            if clone_proc.returncode != 0:
                raw_stderr = clone_proc.stderr
                # Ensure token is never leaked in logs or database records
                if auth_token:
                    raw_stderr = raw_stderr.replace(auth_token, "[REDACTED_TOKEN]")
                error_msg = f"Git clone failed: {raw_stderr}"
                logger.error(error_msg)
                scan_run.status = "FAILED"
                scan_run.error_message = error_msg
                scan_run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": "failed", "reason": error_msg}

            # If commit_sha was HEAD or placeholder, resolve exact SHA from cloned repo
            if commit_sha == "HEAD" or scan_run.commit_sha == "HEAD":
                rev_parse = subprocess.run(
                    ["git", "-C", str(temp_dir), "rev-parse", "HEAD"],
                    capture_output=True,
                    text=True,
                )
                if rev_parse.returncode == 0 and rev_parse.stdout.strip():
                    commit_sha = rev_parse.stdout.strip()
                    scan_run.commit_sha = commit_sha
                    await db.commit()

            # 4. Invoke Aegis CLI
            aegis_bin = get_aegis_bin_path()
            logger.info(f"Executing Aegis CLI ({aegis_bin}) on {temp_dir}...")
            scan_cmd = [
                aegis_bin,
                "scan",
                str(temp_dir),
                "--format=json",
                "--verify",
                "--no-color",
            ]
            try:
                scan_proc = subprocess.run(
                    scan_cmd,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
            except FileNotFoundError:
                error_msg = f"Aegis CLI binary not found at '{aegis_bin}'. Please install Aegis CLI or set AEGIS_BIN_PATH."
                logger.error(error_msg)
                scan_run.status = "FAILED"
                scan_run.error_message = error_msg
                scan_run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": "failed", "reason": error_msg}
            except Exception as err:
                error_msg = f"Aegis CLI execution failure: {str(err)}"
                logger.error(error_msg)
                scan_run.status = "FAILED"
                scan_run.error_message = error_msg
                scan_run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": "failed", "reason": error_msg}

            # Exit code 0 (clean) or 1 (findings detected) are valid
            if scan_proc.returncode not in (0, 1):
                error_msg = f"Aegis CLI failed (code {scan_proc.returncode}): {scan_proc.stderr}"
                logger.error(error_msg)
                scan_run.status = "FAILED"
                scan_run.error_message = error_msg
                scan_run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": "failed", "reason": error_msg}

            # 5. Parse Findings Report
            try:
                report: Dict[str, Any] = json.loads(scan_proc.stdout)
            except Exception as e:
                error_msg = f"Failed to parse JSON report: {str(e)}\nOutput: {scan_proc.stdout[:300]}"
                logger.error(error_msg)
                scan_run.status = "FAILED"
                scan_run.error_message = error_msg
                scan_run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": "failed", "reason": error_msg}

            findings_list: List[Dict[str, Any]] = report.get("findings", [])
            current_fingerprints = set()
            alert_findings: List[Dict[str, Any]] = []
            regressions_count = 0
            active_leaks_count = 0
            critical_count = 0

            # 6. Process each detected finding
            for finding in findings_list:
                rule_id = finding.get("rule_id", "UNKNOWN")
                rule_name = finding.get("title") or finding.get("rule_description") or finding.get("description") or "Detected Secret"
                raw_path = finding.get("file_path", "unknown")
                if str(temp_dir) in raw_path:
                    file_path = os.path.relpath(raw_path, str(temp_dir))
                else:
                    file_path = raw_path
                file_path = file_path.replace("\\", "/").lstrip("./")
                line_no = finding.get("line_number", 0)
                masked_val = finding.get("masked_value", "****")
                severity = finding.get("severity", "HIGH").upper()
                verification = finding.get("verification", {})
                verif_status = verification.get("status", "NOT_VERIFIED")
                verif_details = verification.get("details", "")

                cli_finding_id = finding.get("id", "")
                # Incorporate CLI finding ID so multiple secrets in the same file don't collide
                token_identity = f"{masked_val}:{cli_finding_id}" if cli_finding_id else masked_val
                secret_hash = compute_blind_index(token_identity)
                fingerprint = compute_incident_fingerprint(
                    str(repository.id), rule_id, file_path, secret_hash
                )
                current_fingerprints.add(fingerprint)

                if verif_status == "ACTIVE":
                    active_leaks_count += 1
                if severity == "CRITICAL":
                    critical_count += 1

                # Query if incident already exists
                stmt = select(Incident).where(
                    Incident.repository_id == repository.id,
                    Incident.fingerprint == fingerprint,
                )
                existing_incident = (await db.execute(stmt)).scalar_one_or_none()

                if existing_incident:
                    # Existing incident check
                    previous_status = existing_incident.status
                    existing_incident.last_seen_at = datetime.now(timezone.utc)
                    existing_incident.verification_status = verif_status
                    existing_incident.verification_details = verif_details
                    existing_incident.commit_sha = commit_sha
                    existing_incident.committer_handle = committer_handle

                    if previous_status in ("RESOLVED", "DISMISSED"):
                        # REGRESSION!
                        regressions_count += 1
                        existing_incident.status = "REGRESSION"
                        existing_incident.severity = "CRITICAL"
                        existing_incident.resolved_at = None

                        audit = IncidentAudit(
                            incident_id=existing_incident.id,
                            actor_id="AEGIS_SCANNER",
                            action="REGRESSION_DETECTED",
                            previous_state={"status": previous_status},
                            new_state={"status": "REGRESSION", "commit_sha": commit_sha},
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(audit)

                        alert_findings.append({
                            "rule_id": rule_id,
                            "rule_name": rule_name,
                            "severity": "CRITICAL",
                            "file_path": file_path,
                            "line_number": line_no,
                            "masked_snippet": masked_val,
                            "verification_status": verif_status,
                        })
                else:
                    # New incident
                    encrypted_blob = encrypt_secret(masked_val)
                    new_incident = Incident(
                        repository_id=repository.id,
                        scan_run_id=scan_run.id,
                        fingerprint=fingerprint,
                        secret_hash=secret_hash,
                        encrypted_secret_blob=encrypted_blob,
                        rule_id=rule_id,
                        rule_name=rule_name,
                        severity=severity,
                        status="OPEN",
                        verification_status=verif_status,
                        verification_details=verif_details,
                        file_path=file_path,
                        line_number=line_no,
                        masked_snippet=masked_val,
                        commit_sha=commit_sha,
                        committer_handle=committer_handle,
                        first_seen_at=datetime.now(timezone.utc),
                        last_seen_at=datetime.now(timezone.utc),
                    )
                    db.add(new_incident)
                    await db.flush()

                    audit = IncidentAudit(
                        incident_id=new_incident.id,
                        actor_id="AEGIS_SCANNER",
                        action="DETECTED",
                        previous_state=None,
                        new_state={"status": "OPEN", "severity": severity, "rule_id": rule_id},
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(audit)

                    if severity in ("CRITICAL", "HIGH") or verif_status == "ACTIVE":
                        alert_findings.append({
                            "rule_id": rule_id,
                            "rule_name": rule_name,
                            "severity": severity,
                            "file_path": file_path,
                            "line_number": line_no,
                            "masked_snippet": masked_val,
                            "verification_status": verif_status,
                        })

            # Fetch organization alert webhook configuration
            org = await db.get(Organization, repository.organization_id)
            slack_url = (org.slack_webhook_url if org and org.slack_webhook_url else None) or settings.SLACK_WEBHOOK_URL
            discord_url = org.discord_webhook_url if org and org.discord_webhook_url else None

            # Send aggregated Slack & Discord notification cards (replaces per-finding flood)
            if alert_findings or regressions_count > 0:
                if slack_url and slack_url.strip():
                    await send_slack_scan_summary_alert(
                        repo_name=repository.full_name,
                        branch=branch,
                        commit_sha=commit_sha,
                        committer=committer_handle,
                        total_findings=len(findings_list),
                        active_leaks_count=active_leaks_count,
                        critical_count=critical_count,
                        findings=alert_findings,
                        regressions_count=regressions_count,
                        webhook_url=slack_url,
                    )
                if discord_url and discord_url.strip():
                    await send_discord_scan_summary_alert(
                        webhook_url=discord_url,
                        repo_name=repository.full_name,
                        branch=branch,
                        commit_sha=commit_sha,
                        committer=committer_handle,
                        total_findings=len(findings_list),
                        active_leaks_count=active_leaks_count,
                        critical_count=critical_count,
                        findings=alert_findings,
                        regressions_count=regressions_count,
                    )

            # 7. Resolution Sweep
            # Auto-resolve OPEN incidents whose secrets were removed in this commit
            open_stmt = select(Incident).where(
                Incident.repository_id == repository.id,
                Incident.status.in_(["OPEN", "REGRESSION"]),
            )
            open_incidents = (await db.execute(open_stmt)).scalars().all()
            for inc in open_incidents:
                if inc.fingerprint not in current_fingerprints:
                    inc.status = "RESOLVED"
                    inc.resolved_at = datetime.now(timezone.utc)
                    audit = IncidentAudit(
                        incident_id=inc.id,
                        actor_id="AEGIS_SCANNER",
                        action="AUTO_RESOLVED_REMOVED_IN_COMMIT",
                        previous_state={"status": "OPEN"},
                        new_state={"status": "RESOLVED", "resolved_commit": commit_sha},
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(audit)

            # 8. Finalize ScanRun
            scan_run.status = "COMPLETED"
            scan_run.files_scanned = report.get("total_files_scanned", 0)
            scan_run.total_findings = len(findings_list)
            scan_run.active_leaks_count = report.get("active_leaks_count", 0)
            scan_run.duration_ms = report.get("duration_ms", 0)
            scan_run.completed_at = datetime.now(timezone.utc)
            await db.commit()

            return {
                "status": "success",
                "findings": len(findings_list),
                "active_leaks": report.get("active_leaks_count", 0),
            }

        finally:
            # Clean up cloned repository directory to protect disk
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)


@celery_app.task(name="aegis.tasks.process_scan_event", bind=True, max_retries=2)
def process_scan_event(
    self,
    scan_run_id: str,
    repository_id: str,
    clone_url: str,
    branch: str,
    commit_sha: str,
    committer_handle: Optional[str] = None,
    delivery_guid: Optional[str] = None,
):
    """
    Celery entrypoint for asynchronous repository scanning.
    Invokes the async workflow using asyncio.run.
    """
    guid = delivery_guid or str(uuid.uuid4())
    logger.info(f"Starting Celery scan task for scan_run={scan_run_id} commit={commit_sha[:7]}")
    try:
        result = asyncio.run(
            execute_scan_workflow(
                scan_run_id=scan_run_id,
                repository_id=repository_id,
                clone_url=clone_url,
                branch=branch,
                commit_sha=commit_sha,
                committer_handle=committer_handle,
                delivery_guid=guid,
            )
        )
        return result
    except Exception as exc:
        logger.error(f"Error during scan task: {str(exc)}", exc_info=True)
        # If max retries reached, ensure ScanRun is marked as FAILED in DB to prevent indefinite RUNNING state
        if getattr(self.request, "retries", 0) >= getattr(self, "max_retries", 2):
            try:
                async def mark_failed():
                    async with async_session_factory() as db:
                        sr = await db.get(ScanRun, uuid.UUID(scan_run_id))
                        if sr and sr.status not in ("COMPLETED", "FAILED"):
                            sr.status = "FAILED"
                            sr.error_message = f"Worker failed after retries: {str(exc)}"
                            sr.completed_at = datetime.now(timezone.utc)
                            await db.commit()
                asyncio.run(mark_failed())
            except Exception as db_err:
                logger.error(f"Failed to record ScanRun failure state in DB: {db_err}")
        raise self.retry(exc=exc, countdown=15)
