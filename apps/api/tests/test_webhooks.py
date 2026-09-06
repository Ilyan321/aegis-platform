import hashlib
import hmac
import json
import uuid
import pytest
from httpx import AsyncClient
from app.core.celery_app import celery_app
from app.models.repository import Repository


@pytest.mark.asyncio
async def test_github_webhook_ping(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/webhooks/github",
        headers={
            "X-GitHub-Event": "ping",
            "X-GitHub-Delivery": str(uuid.uuid4()),
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "pong"


@pytest.mark.asyncio
async def test_github_webhook_push_with_valid_hmac(
    async_client: AsyncClient, db_session, test_user_data
):
    # 1. Create a repository with known webhook secret
    secret = "my-secret-webhook-key"
    repo = Repository(
        id=uuid.uuid4(),
        organization_id=test_user_data["org"].id,
        full_name="acme/api-service",
        clone_url="https://github.com/acme/api-service.git",
        default_branch="main",
        webhook_secret=secret,
        is_active=True,
    )
    db_session.add(repo)
    await db_session.commit()

    # 2. Construct payload
    payload = {
        "repository": {
            "id": 123456,
            "full_name": "acme/api-service",
            "clone_url": "https://github.com/acme/api-service.git",
            "default_branch": "main",
        },
        "ref": "refs/heads/main",
        "after": "a" * 40,
        "pusher": {"name": "alice"},
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    delivery_id = str(uuid.uuid4())

    # 3. Post webhook
    celery_app.send_task.reset_mock()
    response = await async_client.post(
        "/api/v1/webhooks/github",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-GitHub-Event": "push",
            "X-GitHub-Delivery": delivery_id,
            "X-Hub-Signature-256": signature,
        },
    )
    assert response.status_code == 202
    res_data = response.json()
    assert res_data["status"] == "accepted"
    assert res_data["repository"] == "acme/api-service"
    assert res_data["commit_sha"] == "a" * 40

    # Verify celery dispatch
    assert celery_app.send_task.called
    kwargs = celery_app.send_task.call_args.kwargs["kwargs"]
    assert kwargs["delivery_guid"] == delivery_id
    assert kwargs["commit_sha"] == "a" * 40


@pytest.mark.asyncio
async def test_github_webhook_invalid_signature_rejected(
    async_client: AsyncClient, db_session, test_user_data
):
    secret = "my-secret-webhook-key"
    repo = Repository(
        id=uuid.uuid4(),
        organization_id=test_user_data["org"].id,
        full_name="acme/secure-repo",
        clone_url="https://github.com/acme/secure-repo.git",
        default_branch="main",
        webhook_secret=secret,
        is_active=True,
    )
    db_session.add(repo)
    await db_session.commit()

    payload = {
        "repository": {
            "full_name": "acme/secure-repo",
            "clone_url": "https://github.com/acme/secure-repo.git",
        },
        "after": "b" * 40,
    }
    raw_body = json.dumps(payload).encode("utf-8")

    # Invalid signature
    bad_resp = await async_client.post(
        "/api/v1/webhooks/github",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-GitHub-Event": "push",
            "X-GitHub-Delivery": str(uuid.uuid4()),
            "X-Hub-Signature-256": "sha256=invalid0000000000000000000000000000000000000000000000000000000000",
        },
    )
    assert bad_resp.status_code == 401
    assert "invalid hmac" in bad_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_github_webhook_pull_request_event(
    async_client: AsyncClient, db_session, test_user_data
):
    secret = "pr-test-webhook-secret"
    repo = Repository(
        id=uuid.uuid4(),
        organization_id=test_user_data["org"].id,
        full_name="acme/feature-service",
        clone_url="https://github.com/acme/feature-service.git",
        default_branch="main",
        webhook_secret=secret,
        is_active=True,
    )
    db_session.add(repo)
    await db_session.commit()

    pr_payload = {
        "action": "opened",
        "number": 42,
        "pull_request": {
            "head": {
                "ref": "feature/payment-v2",
                "sha": "c" * 40,
            },
            "user": {"login": "octocat"},
        },
        "repository": {
            "full_name": "acme/feature-service",
            "clone_url": "https://github.com/acme/feature-service.git",
            "default_branch": "main",
        },
    }
    raw_body = json.dumps(pr_payload).encode("utf-8")
    sig = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    celery_app.send_task.reset_mock()
    resp = await async_client.post(
        "/api/v1/webhooks/github",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-GitHub-Event": "pull_request",
            "X-GitHub-Delivery": str(uuid.uuid4()),
            "X-Hub-Signature-256": sig,
        },
    )
    assert resp.status_code == 202
    res_json = resp.json()
    assert res_json["status"] == "accepted"
    assert res_json["commit_sha"] == "c" * 40
    assert res_json["branch"] == "feature/payment-v2"

    assert celery_app.send_task.called
    kwargs = celery_app.send_task.call_args.kwargs["kwargs"]
    assert kwargs["commit_sha"] == "c" * 40
    assert kwargs["branch"] == "feature/payment-v2"

