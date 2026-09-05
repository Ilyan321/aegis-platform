import logging
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("aegis.notifications")


async def send_slack_incident_alert(
    event_type: str,  # "NEW_LEAK", "ACTIVE_LEAK", "REGRESSION"
    repo_name: str,
    branch: str,
    commit_sha: str,
    committer: Optional[str],
    rule_id: str,
    rule_name: str,
    severity: str,
    file_path: str,
    line_number: int,
    masked_snippet: str,
    verification_status: str,
    verification_details: Optional[str] = None,
) -> bool:
    """
    Dispatches a structured, high-priority Slack Block Kit alert card
    to the configured SecOps channel.
    """
    webhook_url = settings.SLACK_WEBHOOK_URL.strip()
    if not webhook_url:
        logger.debug("SLACK_WEBHOOK_URL is not set; skipping Slack notification")
        return False

    # Severity emojis and titles
    if event_type == "REGRESSION":
        emoji = "🔄⚠️"
        header_title = "REGRESSION: Previously Resolved Secret Reappeared!"
    elif verification_status == "ACTIVE":
        emoji = "🚨🔥"
        header_title = "CRITICAL: Live Active Credential Leak Intercepted!"
    elif severity == "CRITICAL":
        emoji = "🚨"
        header_title = "CRITICAL: High-Risk Secret Detected"
    elif severity == "HIGH":
        emoji = "⚠️"
        header_title = "HIGH SEVERITY: Potential Secret Detected"
    else:
        emoji = "🔍"
        header_title = f"{severity} Secret Finding"

    committer_display = f"@{committer}" if committer else "Unknown"
    short_commit = commit_sha[:7] if commit_sha else "unknown"

    status_badge = f"`{verification_status}`"
    if verification_status == "ACTIVE":
        status_badge = "🔴 *ACTIVE (VERIFIED VALID)*"
    elif verification_status == "REVOKED":
        status_badge = "🟢 *REVOKED (INACTIVE)*"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji} {header_title}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Repository:*\n`{repo_name}`"},
                {"type": "mrkdwn", "text": f"*Branch / Commit:*\n`{branch}` (`{short_commit}`)"},
                {"type": "mrkdwn", "text": f"*Author:*\n{committer_display}"},
                {"type": "mrkdwn", "text": f"*Verification:*\n{status_badge}"},
            ],
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Rule ID:*\n`{rule_id}` ({rule_name})"},
                {"type": "mrkdwn", "text": f"*Location:*\n`{file_path}:{line_number}`"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Masked Token:*\n```{masked_snippet}```"
                + (f"\n*Details:* {verification_details}" if verification_details else ""),
            },
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "🛡️ *Aegis Security Control Plane* • Instant SecOps Intercept",
                }
            ],
        },
        {"type": "divider"},
    ]

    payload: Dict[str, Any] = {"blocks": blocks}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code == 200:
                logger.info(f"Slack notification sent successfully for {repo_name}:{short_commit}")
                return True
            else:
                logger.warning(
                    f"Slack webhook failed with HTTP {resp.status_code}: {resp.text}"
                )
                return False
    except Exception as e:
        logger.error(f"Failed to post Slack notification: {str(e)}")
        return False
