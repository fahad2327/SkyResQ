"""
SkyResQ API Routers Package
"""

from app.api.telemetry import router as telemetry_router
from app.api.detections import router as detections_router
from app.api.video import router as video_router

__all__ = ["telemetry_router", "detections_router", "video_router"]
