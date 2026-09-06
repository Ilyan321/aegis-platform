import json
import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.celery_app import celery_app
from app.core.database import get_db
from app.core.rate_limiter import RateLimiter
from app.models.organization import Organization
from app.models.repository import Repository
from app.models.scan_run import ScanRun
from app.schemas.webhook import WebhookIngestResponse
from app.services.webhook_auth import verify_github_signature

router = APIRouter()
logger = logging.getLogger("aegis.webhooks")
webhook_limiter = RateLimiter(times=120, seconds=60)


@router.post(
    "/github",
    response_model=WebhookIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(webhook_limiter)],
    summary="GitHub Webhook Ingestion Gateway",
    description="Validates HMAC signature and immediately enqueues asynchronous scan to Upstash Redis in <35ms.",
)
async def handle_github_webhook(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    x_github_delivery: str = Header(..., alias="X-GitHub-Delivery"),
    x_github_event: str = Header("push", alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
) -> Any:
    # 1. Handle GitHub Ping event immediately
    if x_github_event == "ping":
        response.status_code = status.HTTP_200_OK
        return WebhookIngestResponse(
            status="pong",
            message="GitHub webhook handshake verified successfully",
            delivery_id=x_github_delivery,
            repository="n/a",
            branch="n/a",
            commit_sha="n/a",
        )

    # 2. Extract raw body for constant-time HMAC validation
    raw_body = await request.body()
    try:
        payload: Dict[str, Any] = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON payload: {str(e)}",
        )

    # 3. Extract repository details
    repo_data = payload.get("repository", {})
    repo_full_name = repo_data.get("full_name")
    github_repo_id = repo_data.get("id")
    clone_url = repo_data.get("clone_url")

    if not repo_full_name or not clone_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payload missing essential repository metadata (full_name, clone_url)",
        )

    # 4. Lookup or auto-provision repository
    if github_repo_id is not None:
        stmt = select(Repository).where(
            (Repository.full_name == repo_full_name) | (Repository.github_repo_id == github_repo_id)
        )
    else:
        stmt = select(Repository).where(Repository.full_name == repo_full_name)
    result = await db.execute(stmt)
    repository = result.scalars().first()

    if not repository:
        # Auto-provision repository under default organization for frictionless DX
        org_stmt = select(Organization).limit(1)
        org_result = await db.execute(org_stmt)
        org = org_result.scalar_one_or_none()

        if not org:
            org = Organization(name="Default Organization", slug="default-org")
            db.add(org)
            await db.flush()

        default_secret = settings.WEBHOOK_SECRET_DEFAULT
        repository = Repository(
            organization_id=org.id,
            github_repo_id=github_repo_id,
            full_name=repo_full_name,
            clone_url=clone_url,
            default_branch=repo_data.get("default_branch", "main"),
            webhook_secret=default_secret,
            is_active=True,
        )
        db.add(repository)
        await db.flush()

    # 5. Validate HMAC signature
    # In production or non-debug environments, HMAC is strictly required.
    # If a webhook signature header is provided, it is always strictly verified.
    enforce_hmac = (
        settings.ENVIRONMENT == "production"
        or not settings.DEBUG
        or bool(x_hub_signature_256)
    )
    if enforce_hmac:
        if not x_hub_signature_256:
            logger.warning(
                f"Missing HMAC signature header for repo={repo_full_name} delivery={x_github_delivery}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing HMAC-SHA256 signature (X-Hub-Signature-256)",
            )
        is_valid = verify_github_signature(
            raw_body=raw_body,
            secret=repository.webhook_secret,
            signature_header=x_hub_signature_256,
        )
        if not is_valid:
            logger.warning(
                f"Unauthorized webhook rejected for repo={repo_full_name} delivery={x_github_delivery}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid HMAC-SHA256 signature (X-Hub-Signature-256)",
            )

    # 6. Extract commit and branch based on event type
    if x_github_event == "pull_request":
        pr_data = payload.get("pull_request", {})
        action = payload.get("action", "")
        if action not in ("opened", "synchronize", "reopened"):
            response.status_code = status.HTTP_200_OK
            return WebhookIngestResponse(
                status="ignored",
                message=f"Pull request action '{action}' skipped",
                delivery_id=x_github_delivery,
                repository=repo_full_name,
                branch=repository.default_branch,
                commit_sha="n/a",
            )
        head_data = pr_data.get("head", {})
        branch = head_data.get("ref") or repository.default_branch
        commit_sha = head_data.get("sha")
        pusher = pr_data.get("user", {}).get("login") or payload.get("sender", {}).get("login")
        trigger_source = "pull_request"
    else:
        # push event (default)
        ref = payload.get("ref", "")
        branch = ref.replace("refs/heads/", "") if "refs/heads/" in ref else (ref or repository.default_branch)
        commit_sha = payload.get("after") or payload.get("head_commit", {}).get("id")
        pusher = payload.get("pusher", {}).get("name") or payload.get("sender", {}).get("login")
        trigger_source = "webhook"

    # If branch was deleted (commit is 40 zeroes) or commit is missing, acknowledge without scanning
    if not commit_sha or commit_sha == "0000000000000000000000000000000000000000":
        response.status_code = status.HTTP_200_OK
        return WebhookIngestResponse(
            status="ignored",
            message="No active commit SHA or branch deletion detected; scan skipped",
            delivery_id=x_github_delivery,
            repository=repo_full_name,
            branch=branch,
            commit_sha=commit_sha or "0000000",
        )

    # 7. Create ScanRun audit record
    scan_run = ScanRun(
        repository_id=repository.id,
        commit_sha=commit_sha,
        branch=branch,
        trigger_source=trigger_source,
        status="QUEUED",
    )
    db.add(scan_run)
    await db.commit()
    await db.refresh(scan_run)

    # 8. Asynchronously dispatch scan task to Upstash Redis queue via Celery
    pusher = payload.get("pusher", {}).get("name") or payload.get("sender", {}).get("login")
    try:
        celery_app.send_task(
            "aegis.tasks.process_scan_event",
            kwargs={
                "scan_run_id": str(scan_run.id),
                "repository_id": str(repository.id),
                "clone_url": clone_url,
                "branch": branch,
                "commit_sha": commit_sha,
                "committer_handle": pusher,
                "delivery_guid": x_github_delivery,
            },
        )
    except Exception as exc:
        logger.error(f"Failed to enqueue scan task: {exc}", exc_info=True)
        scan_run.status = "FAILED"
        scan_run.error_message = f"Broker enqueue error: {str(exc)}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Broker enqueue failed: {str(exc)}",
        )

    logger.info(
        f"Enqueued scan run={scan_run.id} repo={repo_full_name} commit={commit_sha[:7]} delivery={x_github_delivery}"
    )

    return WebhookIngestResponse(
        status="accepted",
        message="Push event verified and enqueued for asynchronous scan",
        delivery_id=x_github_delivery,
        scan_run_id=scan_run.id,
        repository=repo_full_name,
        branch=branch,
        commit_sha=commit_sha,
    )
