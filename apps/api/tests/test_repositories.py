import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.celery_app import celery_app
from app.core.security import create_access_token, hash_password
from app.models.organization import Organization
from app.models.user import User


@pytest.mark.asyncio
async def test_onboard_and_manual_scan(async_client: AsyncClient, test_user_data):
    # 1. Onboard Repository
    payload = {
        "full_name": "acme/payment-gateway",
        "clone_url": "https://github.com/acme/payment-gateway.git",
        "default_branch": "main",
    }
    create_resp = await async_client.post(
        "/api/v1/repositories",
        json=payload,
        headers=test_user_data["headers"],
    )
    assert create_resp.status_code == 201
    repo_data = create_resp.json()
    repo_id = repo_data["id"]
    assert repo_data["full_name"] == "acme/payment-gateway"
    assert repo_data["organization_id"] == str(test_user_data["org"].id)

    # Verify baseline scan was dispatched via celery
    assert celery_app.send_task.called
    task_kwargs = celery_app.send_task.call_args.kwargs["kwargs"]
    assert task_kwargs["repository_id"] == repo_id
    assert task_kwargs["commit_sha"] == "HEAD"

    # 2. Trigger Manual Scan
    celery_app.send_task.reset_mock()
    scan_resp = await async_client.post(
        f"/api/v1/repositories/{repo_id}/scan",
        headers=test_user_data["headers"],
    )
    assert scan_resp.status_code == 202
    scan_data = scan_resp.json()
    assert scan_data["repository_id"] == repo_id
    assert scan_data["status"] == "QUEUED"
    assert scan_data["trigger_source"] == "manual"

    # Verify manual scan celery dispatch
    assert celery_app.send_task.called

    # 3. List Scans for Repository
    scans_list_resp = await async_client.get(
        f"/api/v1/repositories/{repo_id}/scans",
        headers=test_user_data["headers"],
    )
    assert scans_list_resp.status_code == 200
    scans_list = scans_list_resp.json()
    assert len(scans_list) >= 2  # Baseline scan + manual scan


@pytest.mark.asyncio
async def test_cross_organization_repository_isolation(
    async_client: AsyncClient, db_session: AsyncSession, test_user_data
):
    # Create Repo under Org A (Alice)
    create_resp = await async_client.post(
        "/api/v1/repositories",
        json={
            "full_name": "acme/core-engine",
            "clone_url": "https://github.com/acme/core-engine.git",
        },
        headers=test_user_data["headers"],
    )
    assert create_resp.status_code == 201
    repo_id = create_resp.json()["id"]

    # Create User B under Org B (Bob)
    org_b = Organization(id=uuid.uuid4(), name="Other Org", slug="other-org")
    db_session.add(org_b)
    await db_session.flush()

    user_b = User(
        id=uuid.uuid4(),
        email="bob@other.org",
        hashed_password=hash_password("Password123!"),
        organization_id=org_b.id,
        provider="local",
        is_active=True,
    )
    db_session.add(user_b)
    await db_session.commit()

    token_b = create_access_token(user_id=str(user_b.id), email=user_b.email)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Bob attempts to access Alice's repository -> 404
    get_resp = await async_client.get(f"/api/v1/repositories/{repo_id}", headers=headers_b)
    assert get_resp.status_code == 404

    # Bob attempts to trigger scan on Alice's repo -> 404
    scan_resp = await async_client.post(f"/api/v1/repositories/{repo_id}/scan", headers=headers_b)
    assert scan_resp.status_code == 404

    # Bob attempts to delete Alice's repo -> 404
    delete_resp = await async_client.delete(f"/api/v1/repositories/{repo_id}", headers=headers_b)
    assert delete_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_repository(async_client: AsyncClient, test_user_data):
    # Onboard
    create_resp = await async_client.post(
        "/api/v1/repositories",
        json={
            "full_name": "acme/temporary-service",
            "clone_url": "https://github.com/acme/temporary-service.git",
        },
        headers=test_user_data["headers"],
    )
    assert create_resp.status_code == 201
    repo_id = create_resp.json()["id"]

    # Delete
    del_resp = await async_client.delete(
        f"/api/v1/repositories/{repo_id}",
        headers=test_user_data["headers"],
    )
    assert del_resp.status_code == 204

    # Verify deleted
    get_resp = await async_client.get(
        f"/api/v1/repositories/{repo_id}",
        headers=test_user_data["headers"],
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_trigger_scan_all_repositories(async_client: AsyncClient, test_user_data):
    # Onboard two repositories
    await async_client.post(
        "/api/v1/repositories",
        json={"full_name": "acme/service-alpha", "clone_url": "https://github.com/acme/service-alpha.git"},
        headers=test_user_data["headers"],
    )
    await async_client.post(
        "/api/v1/repositories",
        json={"full_name": "acme/service-beta", "clone_url": "https://github.com/acme/service-beta.git"},
        headers=test_user_data["headers"],
    )

    celery_app.send_task.reset_mock()
    scan_all_resp = await async_client.post(
        "/api/v1/repositories/scan-all",
        headers=test_user_data["headers"],
    )
    assert scan_all_resp.status_code == 202
    data = scan_all_resp.json()
    assert len(data) >= 2
    assert all(item["trigger_source"] == "manual_all" for item in data)
    assert celery_app.send_task.called

