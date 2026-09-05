from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import settings

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
    allow_origin_regex=r"https://.*\.vercel\.app" if not is_wildcard else None,
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
        "commit": "3ea040f",
    }


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root():
    return {
        "name": "Aegis Platform API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "v1_endpoints": "/api/v1",
    }
