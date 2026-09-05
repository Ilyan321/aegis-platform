import logging
from typing import Any, Optional
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
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
):
    # 1. Check if email is already taken
    stmt = select(User).where(User.email == data.email.lower().strip())
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists",
        )

    # 2. Create isolated workspace organization for this user
    user_handle = data.email.split("@")[0]
    org_name = f"{data.full_name}'s Workspace" if data.full_name else f"{user_handle.capitalize()}'s Workspace"
    org_slug = f"ws-{user_handle}-{str(uuid.uuid4())[:8]}".lower()
    org = Organization(name=org_name, slug=org_slug)
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


# ==========================================
# GitHub OAuth Flow
# ==========================================

@router.get("/github", summary="Initiate GitHub OAuth authentication")
async def github_login():
    """Redirects the client to GitHub's OAuth authorization gateway."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        error_msg = "GitHub OAuth is not configured yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Render."
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error_msg}")

    redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/github/callback"
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=read:user%20user:email"
    )
    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback", summary="GitHub OAuth authorization callback")
async def github_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchanges the GitHub OAuth code for tokens, synchronizes profile in Neon DB, and issues Aegis JWT."""
    if error or not code:
        err = error or "Authorization code missing"
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=GitHub+login+failed:+{err}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Exchange authorization code for access token
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/github/callback",
                },
            )
            token_data = token_resp.json()
            gh_token = token_data.get("access_token")

            if not gh_token:
                logger.error(f"GitHub token exchange failed: {token_data}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=Failed+to+obtain+GitHub+access+token")

            # 2. Fetch GitHub User profile
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/json"},
            )
            gh_user = user_resp.json()
            gh_id = str(gh_user.get("id"))
            email = gh_user.get("email")
            name = gh_user.get("name") or gh_user.get("login")
            avatar_url = gh_user.get("avatar_url")

            # 3. If primary email is hidden, query emails endpoint
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/json"},
                )
                if emails_resp.status_code == 200:
                    emails_data = emails_resp.json()
                    for item in emails_data:
                        if item.get("primary") and item.get("verified"):
                            email = item.get("email")
                            break
                    if not email and emails_data:
                        email = emails_data[0].get("email")

            if not email:
                email = f"{gh_id}+{gh_user.get('login')}@users.noreply.github.com"

            email = email.lower().strip()

        # 4. Upsert user in Neon DB
        stmt = select(User).where((User.email == email) | ((User.provider == "github") & (User.provider_id == gh_id)))
        user = (await db.execute(stmt)).scalars().first()

        if user:
            user.provider = "github"
            user.provider_id = gh_id
            if avatar_url:
                user.avatar_url = avatar_url
            if name and not user.full_name:
                user.full_name = name
        else:
            user_handle = email.split("@")[0]
            org_name = f"{name}'s Workspace" if name else f"{user_handle.capitalize()}'s Workspace"
            org_slug = f"ws-{user_handle}-{str(uuid.uuid4())[:8]}".lower()
            org = Organization(name=org_name, slug=org_slug)
            db.add(org)
            await db.flush()


            user = User(
                email=email,
                full_name=name,
                avatar_url=avatar_url,
                provider="github",
                provider_id=gh_id,
                organization_id=org.id,
                is_active=True,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

        # 5. Issue Aegis JWT and redirect to frontend
        token = create_access_token(user_id=str(user.id), email=user.email)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/callback?token={token}")

    except Exception as e:
        logger.exception("GitHub OAuth exchange error")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=GitHub+authentication+error")


# ==========================================
# Google OAuth Flow
# ==========================================

@router.get("/google", summary="Initiate Google OAuth authentication")
async def google_login():
    """Redirects the client to Google's OAuth authorization gateway."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        error_msg = "Google OAuth is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Render."
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error_msg}")

    redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/google/callback"
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&prompt=select_account"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback", summary="Google OAuth authorization callback")
async def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchanges the Google OAuth code for tokens, synchronizes profile in Neon DB, and issues Aegis JWT."""
    if error or not code:
        err = error or "Authorization code missing"
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=Google+login+failed:+{err}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Exchange code for access token
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/google/callback",
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_resp.json()
            google_token = token_data.get("access_token")

            if not google_token:
                logger.error(f"Google token exchange failed: {token_data}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=Failed+to+obtain+Google+access+token")

            # 2. Fetch Google user profile
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {google_token}"},
            )
            g_user = user_resp.json()
            g_id = str(g_user.get("id"))
            email = g_user.get("email")
            name = g_user.get("name")
            avatar_url = g_user.get("picture")

            if not email:
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=Google+profile+did+not+provide+an+email")

            email = email.lower().strip()

        # 3. Upsert user in Neon DB
        stmt = select(User).where((User.email == email) | ((User.provider == "google") & (User.provider_id == g_id)))
        user = (await db.execute(stmt)).scalars().first()

        if user:
            user.provider = "google"
            user.provider_id = g_id
            if avatar_url:
                user.avatar_url = avatar_url
            if name and not user.full_name:
                user.full_name = name
        else:
            user_handle = email.split("@")[0]
            org_name = f"{name}'s Workspace" if name else f"{user_handle.capitalize()}'s Workspace"
            org_slug = f"ws-{user_handle}-{str(uuid.uuid4())[:8]}".lower()
            org = Organization(name=org_name, slug=org_slug)
            db.add(org)
            await db.flush()


            user = User(
                email=email,
                full_name=name,
                avatar_url=avatar_url,
                provider="google",
                provider_id=g_id,
                organization_id=org.id,
                is_active=True,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

        # 4. Issue Aegis JWT and redirect to frontend
        token = create_access_token(user_id=str(user.id), email=user.email)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/callback?token={token}")

    except Exception as e:
        logger.exception("Google OAuth exchange error")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=Google+authentication+error")

