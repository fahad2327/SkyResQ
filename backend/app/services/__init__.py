"""
SkyResQ Services Package
"""

from app.services.telemetry_service import TelemetryService, telemetry_service
from app.services.detection_service import DetectionService, detection_service

__all__ = [
    "TelemetryService",
    "telemetry_service",
    "DetectionService",
    "detection_service"
]
