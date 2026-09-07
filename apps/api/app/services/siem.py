import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import httpx

logger = logging.getLogger("aegis.siem")

SEVERITY_CEF_MAP = {
    "CRITICAL": 10,
    "HIGH": 7,
    "MEDIUM": 5,
    "LOW": 2,
}

SEVERITY_SYSLOG_MAP = {
    "CRITICAL": 2,  # Critical: critical conditions
    "HIGH": 3,      # Error: error conditions
    "MEDIUM": 4,    # Warning: warning conditions
    "LOW": 6,       # Informational: informational messages
}


def format_cef_event(
    rule_id: str,
    rule_name: str,
    severity: str,
    action: str,
    actor_id: str,
    repo_name: str,
    file_path: Optional[str] = None,
    line_number: Optional[int] = None,
    client_ip: Optional[str] = None,
    commit_sha: Optional[str] = None,
    details: Optional[str] = None,
) -> str:
    """
    Encodes security incident / audit event in Common Event Format (CEF:0).
    Widely supported by Splunk, ArcSight, QRadar, and LogRhythm.
    """
    sev_score = SEVERITY_CEF_MAP.get(severity.upper(), 5)
    extensions: Dict[str, str] = {
        "act": action,
        "suser": actor_id,
        "cs1": repo_name,
        "cs1Label": "Repository",
    }
    if file_path:
        extensions["cs2"] = file_path
        extensions["cs2Label"] = "FilePath"
    if line_number:
        extensions["cn1"] = str(line_number)
        extensions["cn1Label"] = "LineNumber"
    if commit_sha:
        extensions["cs3"] = commit_sha
        extensions["cs3Label"] = "CommitSHA"
    if client_ip:
        extensions["src"] = client_ip
    if details:
        extensions["msg"] = details.replace("|", "\\|").replace("\n", " ")

    ext_str = " ".join(f"{k}={v}" for k, v in extensions.items())
    safe_name = rule_name.replace("|", "\\|")
    return f"CEF:0|Aegis Security|Aegis Platform|1.0|{rule_id}|{safe_name}|{sev_score}|{ext_str}"


def format_rfc5424_syslog(
    rule_id: str,
    rule_name: str,
    severity: str,
    action: str,
    actor_id: str,
    repo_name: str,
    file_path: Optional[str] = None,
    line_number: Optional[int] = None,
    client_ip: Optional[str] = None,
    commit_sha: Optional[str] = None,
    incident_id: Optional[str] = None,
    details: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Formats a JSON Syslog record adhering to RFC 5424 structured data specifications.
    Suited for Datadog Logs API, AWS CloudWatch, Elastic Stack, and Splunk HEC.
    """
    syslog_sev = SEVERITY_SYSLOG_MAP.get(severity.upper(), 4)
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "version": 1,
        "facility": 4,  # authpriv
        "severity": syslog_sev,
        "timestamp": now_iso,
        "hostname": "aegis-security-control-plane",
        "app_name": "aegis-secops",
        "proc_id": incident_id or "secops-daemon",
        "msg_id": action,
        "structured_data": {
            "aegis@soc": {
                "rule_id": rule_id,
                "rule_name": rule_name,
                "severity": severity,
                "repository": repo_name,
                "file_path": file_path or "",
                "line_number": line_number or 0,
                "commit_sha": commit_sha or "",
                "actor": actor_id,
                "client_ip": client_ip or "",
            }
        },
        "message": details or f"{rule_name} leak event in {repo_name}",
    }


async def dispatch_siem_event(
    target_url: str,
    event_payload: Dict[str, Any] | str,
    format_type: str = "json",
    timeout: float = 6.0,
) -> tuple[bool, str]:
    """
    Dispatches formatted SIEM event payload to an enterprise HTTPS webhook endpoint.
    """
    clean_url = target_url.strip()
    if not clean_url:
        return False, "Target SIEM URL is empty"

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if format_type == "cef":
                resp = await client.post(
                    clean_url,
                    content=str(event_payload),
                    headers={"Content-Type": "text/plain"},
                )
            else:
                resp = await client.post(
                    clean_url,
                    json=event_payload if isinstance(event_payload, dict) else json.loads(event_payload),
                    headers={"Content-Type": "application/json"},
                )

            if resp.status_code in (200, 201, 202, 204):
                return True, "SIEM event successfully dispatched"
            return False, f"SIEM endpoint returned HTTP {resp.status_code}: {resp.text}"
    except Exception as exc:
        logger.error(f"Failed to dispatch SIEM event to {clean_url}: {exc}")
        return False, str(exc)
