import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident
from app.models.repository import Repository
from app.services.audit import (
    GENESIS_PREVIOUS_HASH,
    compute_audit_hash,
    create_tamper_evident_audit,
    verify_audit_chain,
)
from app.services.siem import (
    dispatch_siem_event,
    format_cef_event,
    format_rfc5424_syslog,
)


def test_tamper_evident_hashing_and_verification():
    # 1. Test single hash calculation
    h1 = compute_audit_hash(
        incident_id="inc-1",
        actor_id="alice@example.com",
        action="DETECTED",
        previous_state=None,
        new_state={"status": "OPEN"},
        client_ip="192.168.1.1",
        timestamp="2026-09-07T12:00:00Z",
        previous_hash=GENESIS_PREVIOUS_HASH,
    )
    assert len(h1) == 64
    assert isinstance(h1, str)

    # 2. Test subsequent linked hash calculation
    h2 = compute_audit_hash(
        incident_id="inc-1",
        actor_id="bob@example.com",
        action="STATUS_CHANGE_RESOLVED",
        previous_state={"status": "OPEN"},
        new_state={"status": "RESOLVED"},
        client_ip="192.168.1.2",
        timestamp="2026-09-07T12:30:00Z",
        previous_hash=h1,
    )
    assert len(h2) == 64
    assert h1 != h2


def test_siem_event_formatting():
    # 1. Test CEF Formatting
    cef_str = format_cef_event(
        rule_id="AEGIS-AWS-001",
        rule_name="AWS Access Key ID",
        severity="CRITICAL",
        action="LEAK_DETECTED",
        actor_id="developer_1",
        repo_name="acme/api-gateway",
        file_path="src/config.py",
        line_number=42,
        client_ip="10.0.0.5",
        commit_sha="a1b2c3d4e5f6",
        details="Critical credential intercepted",
    )
    assert cef_str.startswith("CEF:0|Aegis Security|Aegis Platform|1.0|AEGIS-AWS-001|AWS Access Key ID|10|")
    assert "cs1=acme/api-gateway" in cef_str
    assert "cn1=42" in cef_str
    assert "src=10.0.0.5" in cef_str

    # 2. Test RFC 5424 Syslog JSON formatting
    syslog_data = format_rfc5424_syslog(
        rule_id="AEGIS-STRIPE-001",
        rule_name="Stripe Secret Key",
        severity="HIGH",
        action="REGRESSION_DETECTED",
        actor_id="ci_bot",
        repo_name="acme/payment-svc",
        file_path="routes/pay.ts",
        line_number=18,
        commit_sha="fedcba987654",
        incident_id="test-inc-id",
    )
    assert syslog_data["version"] == 1
    assert syslog_data["facility"] == 4
    assert syslog_data["severity"] == 3
    assert syslog_data["structured_data"]["aegis@soc"]["rule_id"] == "AEGIS-STRIPE-001"


@pytest.mark.asyncio
async def test_siem_dispatch_graceful_failure():
    # Attempt dispatch to empty/invalid URL
    ok, msg = await dispatch_siem_event("", {"test": "data"})
    assert ok is False
    assert "empty" in msg


@pytest.mark.asyncio
async def test_compliance_export_and_audit_chain(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user_data,
):
    # 1. Create a repository and incident
    repo = Repository(
        full_name="acme/backend-service",
        clone_url="https://github.com/acme/backend-service.git",
        default_branch="main",
        webhook_secret="test-webhook-secret-123",
        organization_id=test_user_data["org"].id,
    )
    db_session.add(repo)
    await db_session.flush()

    inc = Incident(
        repository_id=repo.id,
        rule_id="AEGIS-RSA-001",
        rule_name="RSA Private Key",
        severity="CRITICAL",
        status="OPEN",
        verification_status="ACTIVE",
        file_path="certs/server.pem",
        line_number=1,
        masked_snippet="-----BEGIN RSA PRIVATE KEY-----****",
        commit_sha="11223344556677889900aabbccddeeff11223344",
        committer_handle="alice",
        secret_hash="a"*64,
        fingerprint="fp12345",
    )
    db_session.add(inc)
    await db_session.commit()
    await db_session.refresh(inc)

    # 2. Triage incident status to RESOLVED via API
    triage_resp = await async_client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        json={"status": "RESOLVED", "reason": "Revoked key and rotated in AWS KMS"},
        headers=test_user_data["headers"],
    )
    assert triage_resp.status_code == 200
    assert triage_resp.json()["status"] == "RESOLVED"

    # 3. Verify audit history endpoint
    audit_resp = await async_client.get(
        f"/api/v1/incidents/{inc.id}/audits",
        headers=test_user_data["headers"],
    )
    assert audit_resp.status_code == 200
    audits = audit_resp.json()
    assert len(audits) >= 1
    assert audits[0]["entry_hash"] is not None
    assert audits[0]["previous_hash"] is not None

    # 4. Test SOC 2 Compliance Export (CSV)
    export_csv = await async_client.get(
        "/api/v1/incidents/export?format=csv",
        headers=test_user_data["headers"],
    )
    assert export_csv.status_code == 200
    assert "text/csv" in export_csv.headers["content-type"]
    assert export_csv.headers["x-aegis-audit-integrity"] == "VERIFIED_VALID"
    assert "Incident ID,Repository,Rule ID" in export_csv.text
    assert "AEGIS-RSA-001" in export_csv.text
    assert "VERIFIED_VALID" in export_csv.text

    # 5. Test SOC 2 Compliance Export (JSON)
    export_json = await async_client.get(
        "/api/v1/incidents/export?format=json",
        headers=test_user_data["headers"],
    )
    assert export_json.status_code == 200
    assert export_json.headers["x-aegis-audit-integrity"] == "VERIFIED_VALID"
    report = export_json.json()
    assert report["report_type"] == "SOC2_ISO27001_COMPLIANCE_AUDIT"
    assert report["compliance_guarantee"] == "TAMPER_EVIDENT_HASH_CHAINED"
    assert report["total_incidents"] >= 1
    assert report["incidents"][0]["audit_chain_valid"] is True
