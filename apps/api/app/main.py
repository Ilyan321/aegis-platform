from datetime import datetime, timezone
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Aegis Platform API",
    description="Centralized cloud-native control plane and orchestration fabric for the Aegis security ecosystem",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Ultra-fast keep-alive health check for cloud ping monitors (cron-job.org / UptimeRobot)."""
    return {
        "status": "healthy",
        "service": "aegis-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "Aegis Platform API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }
