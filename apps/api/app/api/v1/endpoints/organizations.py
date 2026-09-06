import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationRead,
    OrganizationSettingsRead,
    OrganizationSettingsUpdate,
    TestAlertRequest,
)
from app.services.notifications import send_test_alert

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


@router.get(
    "/settings",
    response_model=OrganizationSettingsRead,
    summary="Get current workspace alert and notification settings",
)
async def get_organization_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to an active organization workspace",
        )
    org = await db.get(Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.patch(
    "/settings",
    response_model=OrganizationSettingsRead,
    summary="Update workspace alert settings (Slack and Discord webhook URLs)",
)
async def update_organization_settings(
    settings_in: OrganizationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to an active organization workspace",
        )
    org = await db.get(Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    if settings_in.slack_webhook_url is not None:
        val = settings_in.slack_webhook_url.strip()
        org.slack_webhook_url = val if val else None

    if settings_in.discord_webhook_url is not None:
        val = settings_in.discord_webhook_url.strip()
        org.discord_webhook_url = val if val else None

    await db.commit()
    await db.refresh(org)
    return org


@router.post(
    "/settings/test-alert",
    summary="Send test alert to configured Slack or Discord webhook",
)
async def trigger_test_alert(
    data: TestAlertRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to an active organization workspace",
        )
    org = await db.get(Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    target_url = org.discord_webhook_url if data.channel == "discord" else org.slack_webhook_url
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No {data.channel.capitalize()} webhook URL has been configured for this workspace.",
        )

    success, message = await send_test_alert(target_url, channel=data.channel)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Test alert failed: {message}",
        )

    return {"status": "success", "channel": data.channel, "message": message}


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

