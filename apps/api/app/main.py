import os
import time
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import get_db
from app.core.status_page import get_status_html

GIT_COMMIT = os.getenv("RENDER_GIT_COMMIT", "df1e950")[:7]

app = FastAPI(
    title="Aegis Platform API",
    description="Centralized cloud-native control plane and orchestration fabric for the Aegis security ecosystem",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
is_wildcard = "*" in settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https://([a-zA-Z0-9_-]+\.)?ilyankhan\.tech$" if not is_wildcard else None,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api/v1")


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    """Ultra-fast keep-alive health check for cloud ping monitors (cron-job.org / UptimeRobot)."""
    return {
        "status": "healthy",
        "service": "aegis-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "commit": GIT_COMMIT,
    }


@app.api_route("/health/ready", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route("/ready", methods=["GET", "HEAD"], tags=["Health"])
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Deep readiness probe inspecting database pool and Redis connectivity with latency metrics."""
    components = {}
    all_healthy = True
    degraded = False

    # 1. Database Connectivity Probe
    t0 = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        db_lat = round((time.perf_counter() - t0) * 1000, 2)
        components["database"] = {"status": "ok", "latency_ms": db_lat}
    except Exception as exc:
        components["database"] = {"status": "down", "error": str(exc)}
        all_healthy = False

    # 2. Redis Connectivity Probe
    if settings.REDIS_URL:
        t0 = time.perf_counter()
        r = None
        try:
            r = aioredis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
            )
            await r.ping()
            redis_lat = round((time.perf_counter() - t0) * 1000, 2)
            components["redis"] = {"status": "ok", "latency_ms": redis_lat}
        except Exception as exc:
            components["redis"] = {"status": "down", "error": str(exc)}
            if settings.ENVIRONMENT != "development":
                all_healthy = False
            else:
                degraded = True
        finally:
            if r:
                await r.aclose()

    overall_status = "healthy" if all_healthy and not degraded else ("degraded" if degraded and all_healthy else "unhealthy")
    status_code = 200 if (all_healthy or degraded) else 503

    payload = {
        "status": overall_status,
        "service": "aegis-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "commit": GIT_COMMIT,
        "components": components,
    }
    return JSONResponse(content=payload, status_code=status_code)


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root(request: Request):
    """Serve Apple-inspired minimalist system status dashboard or JSON based on Accept header."""
    accept_header = request.headers.get("accept", "").lower()
    format_param = request.query_params.get("format", "").lower()

    if format_param == "json" or ("application/json" in accept_header and "text/html" not in accept_header):
        return {
            "name": "Aegis Platform API",
            "version": "1.0.0",
            "status": "online",
            "commit": GIT_COMMIT,
            "docs": "/docs",
            "v1_endpoints": "/api/v1",
        }

    return HTMLResponse(
        content=get_status_html(commit=GIT_COMMIT, version="1.0.0"),
        status_code=200,
    )
