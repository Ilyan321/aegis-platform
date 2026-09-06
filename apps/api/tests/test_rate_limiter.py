import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_rate_limiter_in_memory_blocks_after_threshold():
    """Verify RateLimiter triggers HTTP 429 Too Many Requests once limit is exhausted."""
    limiter = RateLimiter(times=3, seconds=60)
    test_app = FastAPI()

    @test_app.get("/limited", dependencies=[Depends(limiter)])
    async def limited_endpoint():
        return {"ok": True}

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First 3 requests should succeed
        for i in range(3):
            res = await client.get("/limited")
            assert res.status_code == 200
            assert res.json() == {"ok": True}

        # 4th request must be rejected with 429
        blocked_res = await client.get("/limited")
        assert blocked_res.status_code == 429
        assert "Rate limit exceeded" in blocked_res.json()["detail"]
        assert "retry-after" in blocked_res.headers


@pytest.mark.asyncio
async def test_rate_limiter_per_ip_isolation():
    """Verify RateLimiter tracks separate limits for different client IPs."""
    limiter = RateLimiter(times=1, seconds=60)
    test_app = FastAPI()

    @test_app.get("/ip-test", dependencies=[Depends(limiter)])
    async def ip_endpoint():
        return {"ok": True}

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Client 1
        r1 = await client.get("/ip-test", headers={"X-Forwarded-For": "10.0.0.1"})
        assert r1.status_code == 200

        # Second request from same client fails
        r2 = await client.get("/ip-test", headers={"X-Forwarded-For": "10.0.0.1"})
        assert r2.status_code == 429

        # Request from different client succeeds
        r3 = await client.get("/ip-test", headers={"X-Forwarded-For": "10.0.0.2"})
        assert r3.status_code == 200


@pytest.mark.asyncio
async def test_account_lockout_after_consecutive_failed_logins():
    """Verify AccountLockoutManager locks account after 5 consecutive failed attempts."""
    from fastapi import HTTPException
    from app.core.rate_limiter import AccountLockoutManager

    email = "bruteforce_target@company.org"

    # Reset test state
    await AccountLockoutManager.record_success(email)

    # 4 failed attempts should not trigger lockout
    for _ in range(4):
        await AccountLockoutManager.record_failure(email)
        # Should not raise exception
        await AccountLockoutManager.check_lockout(email)

    # 5th failed attempt triggers 429 lockout
    with pytest.raises(HTTPException) as exc_info:
        await AccountLockoutManager.record_failure(email)
    assert exc_info.value.status_code == 429
    assert "Account is temporarily locked" in exc_info.value.detail or "locked for 15 minutes" in exc_info.value.detail

    # Subsequent check_lockout calls must raise 429
    with pytest.raises(HTTPException) as check_exc:
        await AccountLockoutManager.check_lockout(email)
    assert check_exc.value.status_code == 429
    assert "locked" in check_exc.value.detail

    # Successful login resets the lockout
    await AccountLockoutManager.record_success(email)
    # Should not raise now
    await AccountLockoutManager.check_lockout(email)
