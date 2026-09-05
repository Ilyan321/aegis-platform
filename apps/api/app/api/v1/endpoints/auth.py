import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter()
logger = logging.getLogger("aegis.auth")


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user account",
)
async def register(
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    # 1. Check if email is already taken
    stmt = select(User).where(User.email == data.email.lower().strip())
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists",
        )

    # 2. Lookup or create default organization
    org_stmt = select(Organization).limit(1)
    org = (await db.execute(org_stmt)).scalars().first()
    if not org:
        org = Organization(name="Default Organization", slug="default-org")
        db.add(org)
        await db.flush()

    # 3. Create user
    user = User(
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip() if data.full_name else None,
        provider="local",
        organization_id=org.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 4. Generate JWT
    token = create_access_token(user_id=str(user.id), email=user.email)

    logger.info(f"Registered new user account: {user.email} (ID: {user.id})")
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user with email and password",
)
async def login(
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    # 1. Lookup user by email
    stmt = select(User).where(User.email == data.email.lower().strip())
    user = (await db.execute(stmt)).scalars().first()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 2. Verify password hash
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended or deactivated",
        )

    # 3. Generate JWT
    token = create_access_token(user_id=str(user.id), email=user.email)

    logger.info(f"User authenticated successfully: {user.email}")
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> Any:
    return UserResponse.model_validate(current_user)
