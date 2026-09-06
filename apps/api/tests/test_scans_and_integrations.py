import uuid
import pytest
from httpx import AsyncClient
from app.core.security import decode_access_token


@pytest.mark.asyncio
async def test_get_cli_token(async_client: AsyncClient, test_user_data):
    # 1. Fetch CLI token for authenticated user
    resp = await async_client.get(
        "/api/v1/auth/cli-token",
        headers=test_user_data["headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "cli_token" in data
    assert data["user_email"] == test_user_data["user"].email
    assert data["token_type"] == "bearer"
    assert data["expires_in_days"] == 30

    # 2. Verify token is valid and decodes to current user ID
    payload = decode_access_token(data["cli_token"])
    assert payload is not None
    assert payload["sub"] == str(test_user_data["user"].id)


@pytest.mark.asyncio
async def test_ingest_cli_scan(async_client: AsyncClient, test_user_data):
    # 1. Generate CLI Token
    token_resp = await async_client.get(
        "/api/v1/auth/cli-token",
        headers=test_user_data["headers"],
    )
    cli_token = token_resp.json()["cli_token"]
    cli_headers = {"Authorization": f"Bearer {cli_token}"}

    # 2. Ingest Local CLI Scan Report with 1 finding
    payload = {
        "repository_name": "acme/workstation-tool",
        "commit_sha": "a1b2c3d4e5f67890123456789012345678901234",
        "branch": "feat/payment-integration",
        "duration_ms": 12,
        "total_files_scanned": 15,
        "total_lines_scanned": 1200,
        "total_findings": 1,
        "critical_count": 1,
        "active_leaks_count": 1,
        "findings": [
            {
                "id": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "rule_id": "AEGIS-STRIPE-001",
                "category": "Stripe",
                "title": "Stripe Live Secret Key",
                "file_path": "backend/config.py",
                "line_number": 42,
                "masked_value": "sk_live_********************",
                "severity": "CRITICAL",
                "confidence": "HIGH",
                "verification": {
                    "status": "ACTIVE",
                    "details": "Authenticated as Stripe account acct_12345",
                },
            }
        ],
    }

    resp = await async_client.post(
        "/api/v1/scans/cli",
        json=payload,
        headers=cli_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "synced"
    assert data["incidents_recorded"] == 1
    assert data["active_leaks"] == 1
    assert data["repository_name"] == "acme/workstation-tool"

    # 3. Verify scan is recorded under scans and incidents
    repo_id = data["repository_id"]
    scans_resp = await async_client.get(
        f"/api/v1/repositories/{repo_id}/scans",
        headers=test_user_data["headers"],
    )
    assert scans_resp.status_code == 200
    scans = scans_resp.json()
    assert any(s["trigger_source"] == "cli" and s["commit_sha"] == payload["commit_sha"] for s in scans)


@pytest.mark.asyncio
async def test_organization_settings_and_test_alert(async_client: AsyncClient, test_user_data):
    # 1. Fetch default settings
    get_resp = await async_client.get(
        "/api/v1/organizations/settings",
        headers=test_user_data["headers"],
    )
    assert get_resp.status_code == 200
    settings_data = get_resp.json()
    assert "slack_webhook_url" in settings_data
    assert "discord_webhook_url" in settings_data

    # 2. Update Webhook URLs
    update_resp = await async_client.patch(
        "/api/v1/organizations/settings",
        json={
            "slack_webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX",
            "discord_webhook_url": "https://discord.com/api/webhooks/123456/abcdef",
        },
        headers=test_user_data["headers"],
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["slack_webhook_url"] == "https://hooks.slack.com/services/T000/B000/XXXX"
    assert updated["discord_webhook_url"] == "https://discord.com/api/webhooks/123456/abcdef"

    # 3. Trigger test alert validation (fails gracefully against dummy test URL without crashing)
    alert_resp = await async_client.post(
        "/api/v1/organizations/settings/test-alert",
        json={"channel": "slack"},
        headers=test_user_data["headers"],
    )
    # Expected 502 Bad Gateway because dummy URL cannot be reached, but endpoint must handle it cleanly
    assert alert_resp.status_code in (200, 502)


@pytest.mark.asyncio
async def test_repository_webhook_config_and_manual_install(async_client: AsyncClient, test_user_data):
    # 1. Onboard a test repo
    repo_resp = await async_client.post(
        "/api/v1/repositories",
        json={
            "full_name": "acme/webhook-test-repo",
            "clone_url": "https://github.com/acme/webhook-test-repo.git",
        },
        headers=test_user_data["headers"],
    )
    assert repo_resp.status_code == 201
    repo_id = repo_resp.json()["id"]

    # 2. Fetch Webhook Config
    cfg_resp = await async_client.get(
        f"/api/v1/repositories/{repo_id}/webhook-config",
        headers=test_user_data["headers"],
    )
    assert cfg_resp.status_code == 200
    config_data = cfg_resp.json()
    assert "/api/v1/webhooks/github" in config_data["webhook_url"]
    assert "events" in config_data
    assert "push" in config_data["events"]
    assert "pull_request" in config_data["events"]

    # 3. Attempt install-webhook without OAuth token -> returns 400 with helpful message
    install_resp = await async_client.post(
        f"/api/v1/repositories/{repo_id}/install-webhook",
        headers=test_user_data["headers"],
    )
    assert install_resp.status_code == 400
    assert "No GitHub OAuth access token" in install_resp.json()["detail"]
