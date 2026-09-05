from fastapi import APIRouter
from app.api.v1.endpoints import (
    incidents,
    organizations,
    repositories,
    telemetry,
    webhooks,
)

api_v1_router = APIRouter()

api_v1_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
api_v1_router.include_router(repositories.router, prefix="/repositories", tags=["Repositories"])
api_v1_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_v1_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
api_v1_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
