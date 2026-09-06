import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import create_access_token, hash_password
from app.models.incident import Incident
from app.models.organization import Organization
from app.models.repository import Repository
from app.models.user import User


@pytest.mark.asyncio
async def test_incident_status_triage_and_audit_history(
    async_client: AsyncClient, db_session: AsyncSession, test_user_data
):
    # 1. Create Repository & Incident under Org A
    repo = Repository(
        id=uuid.uuid4(),
        organization_id=test_user_data["org"].id,
        full_name="acme/auth-service",
        clone_url="https://github.com/acme/auth-service.git",
        default_branch="main",
        webhook_secret="secret",
        is_active=True,
    )
    db_session.add(repo)
    await db_session.flush()

    incident = Incident(
        id=uuid.uuid4(),
        repository_id=repo.id,
        rule_id="AWS_KEY",
        rule_name="AWS Access Key ID",
        severity="CRITICAL",
        status="OPEN",
        verification_status="ACTIVE",
        file_path="config/aws.json",
        line_number=42,
        masked_snippet="AKIA****************",
        commit_sha="c" * 40,
        committer_handle="alice",
        fingerprint="fp-" + str(uuid.uuid4()),
        secret_hash="hash-" + str(uuid.uuid4()),
    )
    db_session.add(incident)
    await db_session.commit()

    # 2. List Incidents
    list_resp = await async_client.get("/api/v1/incidents", headers=test_user_data["headers"])
    assert list_resp.status_code == 200
    incidents = list_resp.json()
    assert len(incidents) == 1
    assert incidents[0]["id"] == str(incident.id)
    assert incidents[0]["status"] == "OPEN"

    # 3. Triage Status to RESOLVED
    patch_resp = await async_client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        json={
            "status": "RESOLVED",
            "reason": "Revoked IAM credential and rotated in AWS Secrets Manager",
        },
        headers=test_user_data["headers"],
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["status"] == "RESOLVED"
    assert updated_data["resolved_at"] is not None

    # 4. Verify Forensic Audit Trail
    audit_resp = await async_client.get(
        f"/api/v1/incidents/{incident.id}/audits",
        headers=test_user_data["headers"],
    )
    assert audit_resp.status_code == 200
    audits = audit_resp.json()
    assert len(audits) >= 1
    latest_audit = audits[0]
    assert latest_audit["action"] == "STATUS_CHANGE_RESOLVED"
    assert latest_audit["actor_id"] == test_user_data["user"].email
    assert latest_audit["new_state"]["status"] == "RESOLVED"


@pytest.mark.asyncio
async def test_cross_tenant_incident_isolation(
    async_client: AsyncClient, db_session: AsyncSession, test_user_data
):
    # Org A Incident
    repo = Repository(
        id=uuid.uuid4(),
        organization_id=test_user_data["org"].id,
        full_name="acme/internal-api",
        clone_url="https://github.com/acme/internal-api.git",
        default_branch="main",
        webhook_secret="secret",
        is_active=True,
    )
    db_session.add(repo)
    await db_session.flush()

    incident = Incident(
        id=uuid.uuid4(),
        repository_id=repo.id,
        rule_id="SLACK_TOKEN",
        rule_name="Slack Bot Token",
        severity="HIGH",
        status="OPEN",
        verification_status="NOT_VERIFIED",
        file_path=".env",
        line_number=1,
        masked_snippet="xoxb-****************",
        commit_sha="d" * 40,
        fingerprint="fp-" + str(uuid.uuid4()),
        secret_hash="hash-" + str(uuid.uuid4()),
    )
    db_session.add(incident)
    await db_session.commit()

    # User B in Org B
    org_b = Organization(id=uuid.uuid4(), name="Org B", slug="org-b")
    db_session.add(org_b)
    await db_session.flush()

    user_b = User(
        id=uuid.uuid4(),
        email="bob@org-b.io",
        hashed_password=hash_password("Password123!"),
        organization_id=org_b.id,
        provider="local",
        is_active=True,
    )
    db_session.add(user_b)
    await db_session.commit()

    headers_b = {"Authorization": f"Bearer {create_access_token(str(user_b.id), user_b.email)}"}

    # User B lists incidents -> Empty list
    list_resp = await async_client.get("/api/v1/incidents", headers=headers_b)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0

    # User B tries to triage Org A's incident -> 404
    patch_resp = await async_client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        json={"status": "RESOLVED"},
        headers=headers_b,
    )
    assert patch_resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_incident_status_update(
    async_client: AsyncClient, db_session: AsyncSession, test_user_data
):
    repo = Repository(
        id=uuid.uuid4(),
        organization_id=test_user_data["org"].id,
        full_name="acme/bulk-repo",
        clone_url="https://github.com/acme/bulk-repo.git",
        default_branch="main",
        webhook_secret="secret",
        is_active=True,
    )
    db_session.add(repo)
    await db_session.flush()

    inc1 = Incident(
        id=uuid.uuid4(),
        repository_id=repo.id,
        rule_id="AWS_KEY",
        rule_name="AWS Key 1",
        severity="CRITICAL",
        status="OPEN",
        file_path="src/aws.js",
        line_number=10,
        masked_snippet="AKIA1111111111111111",
        commit_sha="a" * 40,
        fingerprint="fp1-" + str(uuid.uuid4()),
        secret_hash="hash1-" + str(uuid.uuid4()),
    )
    inc2 = Incident(
        id=uuid.uuid4(),
        repository_id=repo.id,
        rule_id="STRIPE_KEY",
        rule_name="Stripe Secret Key",
        severity="HIGH",
        status="OPEN",
        file_path="src/billing.js",
        line_number=20,
        masked_snippet="sk_live_2222222222222222",
        commit_sha="b" * 40,
        fingerprint="fp2-" + str(uuid.uuid4()),
        secret_hash="hash2-" + str(uuid.uuid4()),
    )
    db_session.add_all([inc1, inc2])
    await db_session.commit()

    # Bulk resolve
    bulk_resp = await async_client.post(
        "/api/v1/incidents/bulk-status",
        json={
            "incident_ids": [str(inc1.id), str(inc2.id)],
            "status": "RESOLVED",
            "reason": "Bulk rotated via KMS",
        },
        headers=test_user_data["headers"],
    )
    assert bulk_resp.status_code == 200
    data = bulk_resp.json()
    assert data["updated_count"] == 2
    assert data["status"] == "RESOLVED"
    assert len(data["incident_ids"]) == 2

    # Verify audit records created for both
    audit_resp1 = await async_client.get(
        f"/api/v1/incidents/{inc1.id}/audits",
        headers=test_user_data["headers"],
    )
    assert audit_resp1.status_code == 200
    audits1 = audit_resp1.json()
    assert len(audits1) >= 1
    assert audits1[0]["action"] == "BULK_STATUS_CHANGE_RESOLVED"
    assert audits1[0]["new_state"]["reason"] == "Bulk rotated via KMS"

