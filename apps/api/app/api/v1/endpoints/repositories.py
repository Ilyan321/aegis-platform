import logging
import secrets
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_app import celery_app
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.organization import Organization
from app.models.repository import Repository
from app.models.scan_run import ScanRun
from app.models.user import User
from app.schemas.repository import RepositoryCreate, RepositoryRead, WebhookConfigResponse
from app.schemas.scan_run import ScanRunRead
from app.services.github_service import GitHubService

logger = logging.getLogger("aegis.repositories")
router = APIRouter()


@router.get("", response_model=List[RepositoryRead], summary="List all connected repositories")
async def list_repositories(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)
    stmt = stmt.offset(skip).limit(limit).order_by(Repository.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=RepositoryRead, status_code=status.HTTP_201_CREATED, summary="Onboard repository")
async def create_repository(
    repo_in: RepositoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_org_id = current_user.organization_id or repo_in.organization_id

    # Verify organization exists
    org = await db.get(Organization, target_org_id)
    if not org:
        default_org_stmt = select(Organization).where(Organization.slug == "default-org")
        org = (await db.execute(default_org_stmt)).scalar_one_or_none()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organization {target_org_id} does not exist",
            )
        target_org_id = org.id

    # Check for duplicate in this workspace
    stmt = select(Repository).where(
        Repository.full_name == repo_in.full_name,
        Repository.organization_id == target_org_id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Repository {repo_in.full_name} is already registered in this workspace",
        )

    # Auto-generate webhook secret if not supplied
    webhook_secret = repo_in.webhook_secret or secrets.token_hex(20)

    repo = Repository(
        organization_id=target_org_id,
        github_repo_id=repo_in.github_repo_id,
        full_name=repo_in.full_name,
        clone_url=repo_in.clone_url,
        default_branch=repo_in.default_branch or "main",
        webhook_secret=webhook_secret,
        is_active=True,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)

    # Automatically trigger initial baseline scan
    initial_scan = ScanRun(
        repository_id=repo.id,
        commit_sha="HEAD",
        branch=repo.default_branch,
        trigger_source="manual",
        status="QUEUED",
    )
    db.add(initial_scan)
    await db.commit()
    await db.refresh(initial_scan)

    try:
        celery_app.send_task(
            "aegis.tasks.process_scan_event",
            kwargs={
                "scan_run_id": str(initial_scan.id),
                "repository_id": str(repo.id),
                "clone_url": repo.clone_url,
                "branch": repo.default_branch,
                "commit_sha": "HEAD",
                "committer_handle": current_user.github_username or (current_user.email.split("@")[0] if current_user.email else "operator"),
                "delivery_guid": f"onboard-{uuid.uuid4()}",
            },
        )
        logger.info(f"Enqueued initial scan {initial_scan.id} for repo {repo.full_name}")
    except Exception as exc:
        logger.warning(f"Could not enqueue onboarding scan for {repo.full_name}: {exc}")

    # Automatically attempt to install GitHub Webhook if user has OAuth token
    if current_user.github_access_token and "github.com" in repo.clone_url:
        gh_token = current_user.get_github_token()
        if gh_token:
            installed, msg = await GitHubService.install_repository_webhook(
                github_token=gh_token,
                repo_full_name=repo.full_name,
                webhook_secret=repo.webhook_secret,
            )
            if installed:
                repo.webhook_installed = True
                await db.commit()
                await db.refresh(repo)

    return repo


@router.post(
    "/scan-all",
    response_model=List[ScanRunRead],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger cloud scans across all active repositories in the workspace",
)
async def trigger_scan_all_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to an active organization workspace",
        )

    stmt = select(Repository).where(
        Repository.organization_id == current_user.organization_id,
        Repository.is_active == True,
    )
    repos = (await db.execute(stmt)).scalars().all()
    if not repos:
        return []

    scan_runs = []
    for repo in repos:
        scan_run = ScanRun(
            repository_id=repo.id,
            commit_sha="HEAD",
            branch=repo.default_branch,
            trigger_source="manual_all",
            status="QUEUED",
        )
        db.add(scan_run)
        scan_runs.append((scan_run, repo))

    await db.commit()
    for scan_run, _ in scan_runs:
        await db.refresh(scan_run)

    for scan_run, repo in scan_runs:
        try:
            celery_app.send_task(
                "aegis.tasks.process_scan_event",
                kwargs={
                    "scan_run_id": str(scan_run.id),
                    "repository_id": str(repo.id),
                    "clone_url": repo.clone_url,
                    "branch": repo.default_branch,
                    "commit_sha": "HEAD",
                    "committer_handle": current_user.github_username or (current_user.email.split("@")[0] if current_user.email else "operator"),
                    "delivery_guid": f"manual-all-{uuid.uuid4()}",
                },
            )
            logger.info(f"Enqueued scan {scan_run.id} for repo {repo.full_name}")
        except Exception as exc:
            logger.error(f"Failed to enqueue scan task for {repo.full_name}: {exc}")
            scan_run.status = "FAILED"
            scan_run.error_message = f"Broker enqueue error: {str(exc)}"

    await db.commit()
    return [sr for sr, _ in scan_runs]


@router.get("/{repo_id}", response_model=RepositoryRead, summary="Get repository details")
async def get_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return repo


@router.post(
    "/{repo_id}/scan",
    response_model=ScanRunRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger on-demand scan for repository",
)
async def trigger_repository_scan(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    repo = (await db.execute(stmt)).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    scan_run = ScanRun(
        repository_id=repo.id,
        commit_sha="HEAD",
        branch=repo.default_branch,
        trigger_source="manual",
        status="QUEUED",
    )
    db.add(scan_run)
    await db.commit()
    await db.refresh(scan_run)

    try:
        celery_app.send_task(
            "aegis.tasks.process_scan_event",
            kwargs={
                "scan_run_id": str(scan_run.id),
                "repository_id": str(repo.id),
                "clone_url": repo.clone_url,
                "branch": repo.default_branch,
                "commit_sha": "HEAD",
                "committer_handle": current_user.github_username or (current_user.email.split("@")[0] if current_user.email else "operator"),
                "delivery_guid": f"manual-{uuid.uuid4()}",
            },
        )
        logger.info(f"Enqueued manual scan {scan_run.id} for repo {repo.full_name}")
    except Exception as exc:
        logger.error(f"Failed to enqueue scan task: {exc}", exc_info=True)
        scan_run.status = "FAILED"
        scan_run.error_message = f"Broker enqueue error: {str(exc)}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Broker enqueue failed: {str(exc)}",
        )

    return scan_run


@router.get(
    "/{repo_id}/scans",
    response_model=List[ScanRunRead],
    summary="List scans for repository",
)
async def list_repository_scans(
    repo_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    repo = (await db.execute(stmt)).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    scans_stmt = (
        select(ScanRun)
        .where(ScanRun.repository_id == repo.id)
        .order_by(ScanRun.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(scans_stmt)
    return result.scalars().all()


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete repository")
async def delete_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    await db.delete(repo)
    await db.commit()
    return None


@router.post(
    "/{repo_id}/install-webhook",
    summary="Install or verify GitHub webhook on connected repository",
)
async def install_repository_webhook(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)
    repo = (await db.execute(stmt)).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    gh_token = current_user.get_github_token()
    if not gh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub OAuth access token found for your account. Please link your GitHub account or configure the webhook manually.",
        )

    success, msg = await GitHubService.install_repository_webhook(
        github_token=gh_token,
        repo_full_name=repo.full_name,
        webhook_secret=repo.webhook_secret,
    )
    if success:
        repo.webhook_installed = True
        await db.commit()
        return {"status": "success", "message": msg, "webhook_installed": True}
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub Webhook installation failed: {msg}",
        )


@router.get(
    "/{repo_id}/webhook-config",
    response_model=WebhookConfigResponse,
    summary="Get webhook configuration and payload URL for repository",
)
async def get_repository_webhook_config(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id)
    if current_user.organization_id:
        stmt = stmt.where(Repository.organization_id == current_user.organization_id)
    repo = (await db.execute(stmt)).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    return WebhookConfigResponse(
        webhook_url=GitHubService.get_webhook_url(),
        webhook_secret=repo.webhook_secret,
        webhook_installed=repo.webhook_installed,
        events=["push", "pull_request"],
    )



