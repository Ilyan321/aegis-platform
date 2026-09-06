import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_keepalive_get(async_client: AsyncClient):
    """Verify keep-alive /health endpoint returns 200 OK for ping monitors."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "aegis-api"
    assert "timestamp" in data
    assert "commit" in data


@pytest.mark.asyncio
async def test_health_keepalive_head(async_client: AsyncClient):
    """Verify HEAD /health returns 200 for lightweight ping monitors."""
    response = await async_client.head("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_readiness_probe_success(async_client: AsyncClient):
    """Verify /health/ready probes components and returns 200 with database status."""
    response = await async_client.get("/health/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "components" in data
    assert "database" in data["components"]
    assert data["components"]["database"]["status"] == "ok"
    assert "latency_ms" in data["components"]["database"]


@pytest.mark.asyncio
async def test_readiness_probe_alias(async_client: AsyncClient):
    """Verify /ready alias works equivalently."""
    response = await async_client.get("/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "components" in data


@pytest.mark.asyncio
async def test_cors_headers_allowed_origin(async_client: AsyncClient):
    """Verify allowed aegis vercel deployment origin is accepted."""
    headers = {
        "Origin": "https://aegis-platform-preview-123.vercel.app",
        "Access-Control-Request-Method": "GET",
    }
    response = await async_client.options("/health", headers=headers)
    assert response.headers.get("access-control-allow-origin") == "https://aegis-platform-preview-123.vercel.app"


@pytest.mark.asyncio
async def test_cors_headers_rejected_attacker_origin(async_client: AsyncClient):
    """Verify arbitrary third-party vercel origin is rejected."""
    headers = {
        "Origin": "https://evil-attacker.vercel.app",
        "Access-Control-Request-Method": "GET",
    }
    response = await async_client.options("/health", headers=headers)
    assert response.headers.get("access-control-allow-origin") is None


@pytest.mark.asyncio
async def test_root_serves_apple_html_dashboard(async_client: AsyncClient):
    """Verify GET / renders the Apple-style minimalist HTML status dashboard for browsers."""
    headers = {"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
    response = await async_client.get("/", headers=headers)
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Aegis Platform" in response.text
    assert "Control Plane Online" in response.text
    assert "Operational · 200 OK" in response.text
    assert "color-scheme" in response.text


@pytest.mark.asyncio
async def test_root_serves_json_when_requested(async_client: AsyncClient):
    """Verify GET / returns JSON when Accept: application/json or format=json is specified."""
    # Via Accept header
    headers = {"Accept": "application/json"}
    res_json = await async_client.get("/", headers=headers)
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers.get("content-type", "")
    data = res_json.json()
    assert data["name"] == "Aegis Platform API"
    assert data["status"] == "online"

    # Via ?format=json query param
    res_query = await async_client.get("/?format=json")
    assert res_query.status_code == 200
    assert "application/json" in res_query.headers.get("content-type", "")
    assert res_query.json()["status"] == "online"
