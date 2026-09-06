import asyncio
import os
import uuid
from typing import AsyncGenerator
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set required environment variables before importing app
os.environ["ENVIRONMENT"] = "development"
os.environ["DEBUG"] = "true"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-chars-long"
os.environ["AEGIS_MASTER_KEY"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
os.environ["AEGIS_BLIND_PEPPER"] = "test-pepper-salt-32chars-long!!"
os.environ["WEBHOOK_SECRET_DEFAULT"] = "test-default-webhook-secret"

from app.core.celery_app import celery_app
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.organization import Organization
from app.models.user import User

# In-memory SQLite async engine for isolated test runs
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_sessionmaker = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh database session with all tables created."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with test_sessionmaker() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an async HTTP test client with database dependency override and mocked celery."""
    # Mock celery task dispatch so tests don't require live Redis broker
    celery_app.send_task = MagicMock(return_value=MagicMock(id="mock-task-id"))

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_user_data(db_session: AsyncSession):
    """Creates a seeded organization, user, and authorization headers."""
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        name="Acme Security Org",
        slug=f"acme-{str(uuid.uuid4())[:8]}",
    )
    db_session.add(org)
    await db_session.flush()

    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="security.lead@acme.com",
        full_name="Alice Security",
        hashed_password=hash_password("SuperSecretPassword123!"),
        organization_id=org.id,
        provider="local",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user_id=str(user.id), email=user.email)
    headers = {"Authorization": f"Bearer {token}"}

    return {
        "user": user,
        "org": org,
        "token": token,
        "headers": headers,
    }
