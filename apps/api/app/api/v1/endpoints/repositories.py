import secrets
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.organization import Organization
from app.models.repository import Repository
from app.schemas.repository import RepositoryCreate, RepositoryRead, RepositoryUpdate

router = APIRouter()


@router.get("", response_model=List[RepositoryRead], summary="List all connected repositories")
async def list_repositories(
    organization_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository)
    if organization_id:
        stmt = stmt.where(Repository.organization_id == organization_id)
    stmt = stmt.offset(skip).limit(limit).order_by(Repository.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()



@router.post("", response_model=RepositoryRead, status_code=status.HTTP_201_CREATED, summary="Onboard repository")
async def create_repository(
    repo_in: RepositoryCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verify organization exists
    org = await db.get(Organization, repo_in.organization_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization {repo_in.organization_id} does not exist",
        )

    # Check for duplicate
    stmt = select(Repository).where(Repository.full_name == repo_in.full_name)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Repository {repo_in.full_name} is already registered",
        )

    # Auto-generate webhook secret if not supplied
    webhook_secret = repo_in.webhook_secret or secrets.token_hex(20)

    repo = Repository(
        organization_id=repo_in.organization_id,
        github_repo_id=repo_in.github_repo_id,
        full_name=repo_in.full_name,
        clone_url=repo_in.clone_url,
        default_branch=repo_in.default_branch,
        webhook_secret=webhook_secret,
        is_active=True,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    return repo


@router.get("/{repo_id}", response_model=RepositoryRead, summary="Get repository details")
async def get_repository(
    repo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return repo


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete repository")
async def delete_repository(
    repo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    await db.delete(repo)
    await db.commit()
    return None
