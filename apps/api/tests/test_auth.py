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


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_reuse_detection(async_client: AsyncClient):
    """Verify refresh endpoint rotates tokens and detects replay/reuse attempts."""
    # Register user
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "rtr_test@enterprise.org", "password": "Password123!", "full_name": "RTR User"},
    )
    assert reg_resp.status_code == 201
    refresh_token = reg_resp.json()["refresh_token"]
    assert refresh_token is not None

    # First Refresh: succeeds and rotates token
    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    rotated_refresh_token = data["refresh_token"]
    assert rotated_refresh_token != refresh_token

    # Replay Attempt: Using the old refresh token MUST be rejected
    replay_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert replay_resp.status_code == 401
    assert "revoked or already used" in replay_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_logout_invalidates_session(async_client: AsyncClient):
    """Verify logout endpoint invalidates refresh tokens."""
    # Register user with distinct IP to test in isolation
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "logout_test@enterprise.org", "password": "Password123!", "full_name": "Logout User"},
        headers={"X-Forwarded-For": "192.168.1.100"},
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # Logout
    logout_resp = await async_client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout_resp.status_code == 200

    # Refresh after logout should fail
    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_verify_email_flow(async_client: AsyncClient):
    """Verify registration dispatches OTP and /verify-email activates the account."""
    from app.services.auth_tokens import EmailVerificationManager

    user_email = "verify_test@enterprise.org"
    ip = "192.168.2.50"
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": user_email, "password": "SecurePassword123!", "full_name": "Verify User"},
        headers={"X-Forwarded-For": ip},
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["user"]["is_verified"] is False

    # Get OTP from manager (either redis or in-memory)
    # Re-generate or inspect stored code
    stored_otp = None
    if user_email in EmailVerificationManager._memory_otps:
        stored_otp = EmailVerificationManager._memory_otps[user_email]["otp"]
    else:
        # Generate fresh OTP
        stored_otp = await EmailVerificationManager.generate_and_store_otp(user_email)

    # 1. Invalid OTP should fail
    bad_resp = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"email": user_email, "otp": "000000"},
        headers={"X-Forwarded-For": ip},
    )
    assert bad_resp.status_code == 400

    # 2. Valid OTP should succeed and mark is_verified=True
    good_resp = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"email": user_email, "otp": stored_otp},
        headers={"X-Forwarded-For": ip},
    )
    assert good_resp.status_code == 200
    good_data = good_resp.json()
    assert good_data["user"]["is_verified"] is True
    assert "access_token" in good_data


@pytest.mark.asyncio
async def test_resend_otp_and_cooldown(async_client: AsyncClient):
    """Verify resend OTP endpoint respects cooldown."""
    user_email = "cooldown_test@enterprise.org"
    ip = "192.168.3.50"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": user_email, "password": "SecurePassword123!", "full_name": "Cooldown User"},
        headers={"X-Forwarded-For": ip},
    )

    # First resend immediate attempt is blocked by 60s cooldown from registration
    resend_resp = await async_client.post(
        "/api/v1/auth/resend-otp",
        json={"email": user_email},
        headers={"X-Forwarded-For": ip},
    )
    assert resend_resp.status_code == 429
    assert "Please wait" in resend_resp.json()["detail"]


@pytest.mark.asyncio
async def test_password_reset_flow(async_client: AsyncClient):
    """Verify forgot password link generation, token consumption, password update, and session revocation."""
    from app.services.auth_tokens import PasswordResetTokenManager

    user_email = "reset_test@enterprise.org"
    ip = "192.168.4.50"
    # Register user
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": user_email, "password": "OldPassword123!", "full_name": "Reset User"},
        headers={"X-Forwarded-For": ip},
    )
    assert reg_resp.status_code == 201
    old_access_token = reg_resp.json()["access_token"]
    user_id = reg_resp.json()["user"]["id"]

    # 1. Non-existent email returns 200 (anti-enumeration)
    anon_resp = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent@company.com"},
        headers={"X-Forwarded-For": "192.168.4.51"},
    )
    assert anon_resp.status_code == 200

    # 2. Existing user forgot-password returns 200
    forgot_resp = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": user_email},
        headers={"X-Forwarded-For": ip},
    )
    assert forgot_resp.status_code == 200

    # 3. Create/retrieve reset token
    token = await PasswordResetTokenManager.create_reset_token(user_id=user_id, email=user_email)

    # 4. Invalid token fails
    bad_token_resp = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalid-token-value-12345", "new_password": "NewSecurePassword456!"},
        headers={"X-Forwarded-For": ip},
    )
    assert bad_token_resp.status_code == 400

    # 5. Valid reset-password succeeds
    reset_resp = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewSecurePassword456!"},
        headers={"X-Forwarded-For": ip},
    )
    assert reset_resp.status_code == 200
    assert "successfully updated" in reset_resp.json()["message"]

    # 6. Reusing same token fails immediately (single-use)
    reuse_resp = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherPassword789!"},
        headers={"X-Forwarded-For": ip},
    )
    assert reuse_resp.status_code == 400

    # 7. Old password no longer works
    old_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": "OldPassword123!"},
        headers={"X-Forwarded-For": ip},
    )
    assert old_login.status_code == 401

    # 8. New password works
    new_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": "NewSecurePassword456!"},
        headers={"X-Forwarded-For": ip},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()

    # 9. Previous session token is revoked
    revoked_me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {old_access_token}"},
    )
    assert revoked_me.status_code == 401
    assert "Session has been revoked" in revoked_me.json()["detail"]


@pytest.mark.asyncio
async def test_profile_update_and_change_password(async_client: AsyncClient):
    """Verifies profile name updates, password changes, and subsequent token invalidation."""
    ip = "192.168.10.15"
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "operator.profile@company.com",
            "password": "InitialPassword123!",
            "full_name": "Original Name",
        },
        headers={"X-Forwarded-For": ip},
    )
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]

    # 1. Update profile full name
    patch_resp = await async_client.patch(
        "/api/v1/auth/profile",
        json={"full_name": "Updated Senior Operator"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["full_name"] == "Updated Senior Operator"

    # 2. Change password with incorrect current password fails
    bad_change = await async_client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "WrongPassword!",
            "new_password": "UpdatedPassword456!",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad_change.status_code == 400
    assert "Current password is incorrect" in bad_change.json()["detail"]

    # 3. Valid password change succeeds and returns new JWT
    good_change = await async_client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "InitialPassword123!",
            "new_password": "UpdatedPassword456!",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert good_change.status_code == 200
    new_token = good_change.json()["access_token"]
    assert new_token != token

    # 4. Old token is now revoked
    old_me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert old_me.status_code == 401

    # 5. New token works
    new_me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert new_me.status_code == 200
    assert new_me.json()["full_name"] == "Updated Senior Operator"


@pytest.mark.asyncio
async def test_revoke_all_sessions(async_client: AsyncClient):
    """Verifies that the global session kill-switch invalidates active tokens."""
    ip = "192.168.10.16"
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "killswitch.user@company.com",
            "password": "SecurePassword123!",
        },
        headers={"X-Forwarded-For": ip},
    )
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]

    # Call revoke all sessions
    revoke_resp = await async_client.post(
        "/api/v1/auth/revoke-all-sessions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoke_resp.status_code == 200
    assert "invalidated" in revoke_resp.json()["message"]

    # Subsequent request using that token is 401 Unauthorized
    me_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 401
    assert "Session has been revoked" in me_resp.json()["detail"]

