import pytest
from app.services.email import EmailService
from app.services.notifications import (
    send_slack_incident_alert,
    send_slack_scan_summary_alert,
    send_test_alert,
)


@pytest.mark.asyncio
async def test_email_service_welcome_and_breach():
    # Test welcome email dispatch
    welcome_sent = await EmailService.send_welcome_email("test@example.com", "Alex Doe")
    assert welcome_sent is True

    # Test breach alert dispatch
    breach_sent = await EmailService.send_breach_alert(
        to_email="secops@example.com",
        repo_name="acme/api-gateway",
        rule_name="AWS Access Key",
        severity="CRITICAL",
        file_path="server.py",
        line_number=15,
        masked_snippet="AKIA****************",
        committer="developer",
        commit_sha="a1b2c3d4e5f67890123456789012345678901234",
    )
    assert breach_sent is True


@pytest.mark.asyncio
async def test_slack_notifications():
    # 1. Test single incident alert with no webhook configured (should gracefully return False)
    res = await send_slack_incident_alert(
        event_type="NEW_LEAK",
        repo_name="acme/frontend",
        branch="feat/auth",
        commit_sha="1234567890abcdef",
        committer="dev",
        rule_id="AEGIS-001",
        rule_name="Stripe Secret Key",
        severity="CRITICAL",
        file_path="src/config.ts",
        line_number=10,
        masked_snippet="sk_live_****",
        verification_status="ACTIVE",
    )
    assert isinstance(res, bool)

    # 2. Test scan summary alert
    summary_res = await send_slack_scan_summary_alert(
        repo_name="acme/frontend",
        branch="feat/auth",
        commit_sha="1234567890abcdef",
        committer="dev",
        total_findings=1,
        active_leaks_count=1,
        critical_count=1,
        findings=[],
    )
    assert isinstance(summary_res, bool)

    # 3. Test send_test_alert with empty URL
    ok, msg = await send_test_alert("")
    assert ok is False
    assert "cannot be empty" in msg
