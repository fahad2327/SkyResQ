"""
SkyResQ Pydantic Data Models Package
"""

from app.models.telemetry import DroneTelemetryResponse, TelemetryStatusResponse
from app.models.detection import (
    BoundingBox,
    DetectionCreate,
    DetectionResponse,
    DetectionSummaryResponse
)
from app.models.video import VideoConfigRequest, VideoStatusResponse

__all__ = [
    "DroneTelemetryResponse",
    "TelemetryStatusResponse",
    "BoundingBox",
    "DetectionCreate",
    "DetectionResponse",
    "DetectionSummaryResponse",
    "VideoConfigRequest",
    "VideoStatusResponse"
]
