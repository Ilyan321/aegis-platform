import logging
from typing import Any, Dict, List, Optional
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


async def send_slack_scan_summary_alert(
    repo_name: str,
    branch: str,
    commit_sha: str,
    committer: Optional[str],
    total_findings: int,
    active_leaks_count: int,
    critical_count: int,
    findings: List[Dict[str, Any]],
    regressions_count: int = 0,
    webhook_url: Optional[str] = None,
) -> bool:
    """
    Dispatches an aggregated, deduplicated Slack Block Kit alert summarizing
    all findings detected in a repository commit or scan run.
    Prevents notification flooding by consolidating findings into a single card.
    """
    target_url = (webhook_url or settings.SLACK_WEBHOOK_URL).strip()
    if not target_url:
        logger.debug("No Slack webhook URL configured; skipping Slack summary")
        return False

    if total_findings == 0 and regressions_count == 0:
        return False

    short_commit = commit_sha[:7] if commit_sha else "unknown"
    committer_display = f"@{committer}" if committer else "Unknown"

    if regressions_count > 0:
        emoji = "🔄⚠️"
        header_title = f"REGRESSION: {regressions_count} Reintroduced Secret(s) in {repo_name}!"
    elif active_leaks_count > 0:
        emoji = "🚨🔥"
        header_title = f"CRITICAL: {active_leaks_count} Live Active Leak(s) Detected in {repo_name}!"
    elif critical_count > 0:
        emoji = "🚨"
        header_title = f"CRITICAL: {critical_count} High-Risk Finding(s) in {repo_name}"
    else:
        emoji = "⚠️"
        header_title = f"Aegis Scan: {total_findings} Secret Finding(s) in {repo_name}"

    blocks: List[Dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji} {header_title}"[:150],
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Repository:*\n`{repo_name}`"},
                {"type": "mrkdwn", "text": f"*Branch:*\n`{branch}` (`{short_commit}`)"},
                {"type": "mrkdwn", "text": f"*Author:*\n{committer_display}"},
                {
                    "type": "mrkdwn",
                    "text": (
                        f"*Findings Summary:*\n"
                        f"Total: *{total_findings}* | "
                        f"Active: *{active_leaks_count}* | "
                        f"Critical: *{critical_count}*"
                    ),
                },
            ],
        },
        {"type": "divider"},
    ]

    # Show top findings preview (up to 5)
    preview_items = findings[:5]
    for idx, item in enumerate(preview_items, 1):
        v_status = item.get("verification_status", "NOT_VERIFIED")
        v_badge = "🔴 *ACTIVE*" if v_status == "ACTIVE" else f"`{v_status}`"
        rule_label = item.get("rule_name") or item.get("rule_id", "Secret")
        path_label = f"{item.get('file_path', 'unknown')}:{item.get('line_number', 0)}"
        masked = item.get("masked_snippet", "****")
        sev = item.get("severity", "HIGH")

        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*{idx}. {rule_label}* (`{sev}`) • {v_badge}\n"
                    f"• *File:* `{path_label}`\n"
                    f"• *Token:* `{masked}`"
                ),
            },
        })

    remaining = total_findings - len(preview_items)
    if remaining > 0:
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"_+ {remaining} additional findings logged to Aegis Control Plane._",
                }
            ],
        })

    blocks.extend([
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "🛡️ *Aegis Security Control Plane* • Continuous Intercept Mesh",
                }
            ],
        },
    ])

    payload: Dict[str, Any] = {"blocks": blocks}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(target_url, json=payload)
            if resp.status_code == 200:
                logger.info(f"Aggregated Slack summary sent for {repo_name}:{short_commit}")
                return True
            else:
                logger.warning(
                    f"Slack summary failed with HTTP {resp.status_code}: {resp.text}"
                )
                return False
    except Exception as e:
        logger.error(f"Failed to post aggregated Slack summary: {str(e)}")
        return False


async def send_discord_scan_summary_alert(
    webhook_url: str,
    repo_name: str,
    branch: str,
    commit_sha: str,
    committer: Optional[str],
    total_findings: int,
    active_leaks_count: int,
    critical_count: int,
    findings: List[Dict[str, Any]],
    regressions_count: int = 0,
) -> bool:
    """
    Dispatches a structured Discord webhook embed summarizing scan findings.
    """
    target_url = webhook_url.strip()
    if not target_url:
        return False

    if total_findings == 0 and regressions_count == 0:
        return False

    short_commit = commit_sha[:7] if commit_sha else "unknown"
    committer_display = f"@{committer}" if committer else "Unknown"

    if regressions_count > 0:
        color = 15158332  # Red
        title = f"🔄 REGRESSION: {regressions_count} Reintroduced Secret(s) in {repo_name}"
    elif active_leaks_count > 0:
        color = 15158332  # Red
        title = f"🚨 CRITICAL: {active_leaks_count} Live Active Leak(s) in {repo_name}"
    elif critical_count > 0:
        color = 15105570  # Orange
        title = f"⚠️ CRITICAL: {critical_count} High-Risk Finding(s) in {repo_name}"
    else:
        color = 16776960  # Yellow
        title = f"🔍 Aegis Scan: {total_findings} Finding(s) in {repo_name}"

    fields = [
        {"name": "Repository", "value": f"`{repo_name}`", "inline": True},
        {"name": "Branch / Commit", "value": f"`{branch}` (`{short_commit}`)", "inline": True},
        {"name": "Author", "value": committer_display, "inline": True},
        {
            "name": "Summary",
            "value": f"Total: **{total_findings}** | Active: **{active_leaks_count}** | Critical: **{critical_count}**",
            "inline": False,
        },
    ]

    # Add top 4 findings as fields
    for idx, item in enumerate(findings[:4], 1):
        v_status = item.get("verification_status", "NOT_VERIFIED")
        rule_label = item.get("rule_name") or item.get("rule_id", "Secret")
        path_label = f"{item.get('file_path', 'unknown')}:{item.get('line_number', 0)}"
        masked = item.get("masked_snippet", "****")
        sev = item.get("severity", "HIGH")
        v_badge = "🔴 ACTIVE" if v_status == "ACTIVE" else v_status

        fields.append({
            "name": f"#{idx} {rule_label} [{sev}]",
            "value": f"• **Status:** `{v_badge}`\n• **File:** `{path_label}`\n• **Token:** `{masked}`",
            "inline": False,
        })

    payload = {
        "content": "🛡️ **Aegis Security Intercept Alert**",
        "embeds": [
            {
                "title": title[:256],
                "color": color,
                "fields": fields,
                "footer": {"text": "Aegis Continuous DevSecOps Platform"},
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(target_url, json=payload)
            return resp.status_code in (200, 204)
    except Exception as exc:
        logger.error(f"Failed to post Discord summary: {exc}")
        return False


async def send_test_alert(webhook_url: str, channel: str = "slack") -> tuple[bool, str]:
    """
    Sends a test verification notification to a user's configured Slack or Discord incoming webhook.
    """
    clean_url = webhook_url.strip()
    if not clean_url:
        return False, "Webhook URL cannot be empty"

    if channel == "discord":
        payload = {
            "content": "🛡️ **Aegis Security Control Plane** — Integration Test",
            "embeds": [
                {
                    "title": "Alert Integration Active",
                    "description": "This test notification confirms your Aegis Platform alert channel is successfully connected.",
                    "color": 2067276,  # Dark green
                    "fields": [
                        {"name": "Status", "value": "🟢 Verified Connected", "inline": True},
                        {"name": "Environment", "value": "Production Control Plane", "inline": True},
                    ],
                    "footer": {"text": "Aegis Continuous DevSecOps Intelligence"},
                }
            ],
        }
    else:  # slack
        payload = {
            "text": "🛡️ *Aegis Security Control Plane* — Alert Integration Verified",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🛡️ Aegis Alert Integration Verified",
                        "emoji": True,
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            "This test notification confirms your workspace alert channel is successfully "
                            "connected to the *Aegis Security Platform*. High-priority leaks and compliance "
                            "incidents will be dispatched here in real time."
                        ),
                    },
                },
                {"type": "divider"},
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "🟢 *Status:* Operational • © Aegis Security Inc.",
                        }
                    ],
                },
            ],
        }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(clean_url, json=payload)
            if resp.status_code in (200, 204):
                return True, f"Successfully dispatched test notification to {channel.capitalize()}."
            else:
                return False, f"{channel.capitalize()} webhook returned HTTP {resp.status_code}: {resp.text}"
    except Exception as exc:
        logger.error(f"Failed to send test alert to {channel}: {exc}")
        return False, str(exc)


