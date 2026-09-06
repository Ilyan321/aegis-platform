import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_new_user(async_client: AsyncClient):
    payload = {
        "email": "devsecops@enterprise.org",
        "password": "StrongPassword123!",
        "full_name": "DevSecOps Lead",
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "devsecops@enterprise.org"
    assert data["user"]["full_name"] == "DevSecOps Lead"
    assert data["user"]["organization_id"] is not None


@pytest.mark.asyncio
async def test_register_duplicate_email(async_client: AsyncClient):
    payload = {
        "email": "duplicate@enterprise.org",
        "password": "StrongPassword123!",
        "full_name": "User One",
    }
    resp1 = await async_client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await async_client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success_and_invalid_password(async_client: AsyncClient):
    # First register
    payload = {
        "email": "login_test@enterprise.org",
        "password": "CorrectPassword123!",
        "full_name": "Test Login",
    }
    reg_resp = await async_client.post("/api/v1/auth/register", json=payload)
    assert reg_resp.status_code == 201

    # Valid Login
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "login_test@enterprise.org", "password": "CorrectPassword123!"},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # Invalid Password
    bad_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "login_test@enterprise.org", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401
    assert "incorrect password" in bad_login.json()["detail"].lower()


@pytest.mark.asyncio
async def test_me_authenticated_and_unauthorized(async_client: AsyncClient, test_user_data):
    # Unauthenticated
    unauth_resp = await async_client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

    # Authenticated
    auth_resp = await async_client.get(
        "/api/v1/auth/me",
        headers=test_user_data["headers"],
    )
    assert auth_resp.status_code == 200
    me_data = auth_resp.json()
    assert me_data["email"] == test_user_data["user"].email
    assert me_data["full_name"] == test_user_data["user"].full_name
