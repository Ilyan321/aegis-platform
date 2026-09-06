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
