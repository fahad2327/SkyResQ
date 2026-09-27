"""
API Routes Package
Aggregates all modular route handlers for SkyResQ API v1.
"""

from fastapi import APIRouter

from app.api.routes import system, drone, mission, detection, media, database, remote_camera, auth

api_router = APIRouter()

# Register sub-routers with clean prefixes and OpenAPI documentation tags
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Operator Security"])
api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(drone.router, prefix="/drone", tags=["Drone"])
api_router.include_router(mission.router, prefix="/mission", tags=["Mission"])
api_router.include_router(detection.router, prefix="/detection", tags=["Detection"])
api_router.include_router(media.router, prefix="/media", tags=["Media"])
api_router.include_router(database.router, prefix="/db", tags=["Database & Persistence"])
api_router.include_router(remote_camera.router, prefix="/remote-camera", tags=["Remote Mobile Camera Feed"])

__all__ = ["api_router"]

