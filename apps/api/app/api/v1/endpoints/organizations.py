import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationRead

router = APIRouter()


@router.get("", response_model=List[OrganizationRead], summary="List organizations")
async def list_organizations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organization).order_by(Organization.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED, summary="Create organization")
async def create_organization(
    org_in: OrganizationCreate,
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
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/{org_id}", response_model=OrganizationRead, summary="Get organization by ID")
async def get_organization(org_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org
