import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationRead

router = APIRouter()


@router.get("", response_model=List[OrganizationRead], summary="List organizations")
async def list_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Organization)
    if current_user.organization_id:
        stmt = stmt.where(Organization.id == current_user.organization_id)
    result = await db.execute(stmt.order_by(Organization.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED, summary="Create organization")
async def create_organization(
    org_in: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Organization).where(Organization.slug == org_in.slug)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization with slug '{org_in.slug}' already exists",
        )

    org = Organization(name=org_in.name, slug=org_in.slug)
    db.add(org)
    await db.flush()

    if not current_user.organization_id:
        current_user.organization_id = org.id

    await db.commit()
    await db.refresh(org)
    return org


@router.get("/{org_id}", response_model=OrganizationRead, summary="Get organization by ID")
async def get_organization(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.organization_id and org_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org

