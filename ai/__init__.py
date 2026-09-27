"""
SkyResQ AI Package
Modular AI and YOLO Object Detection Integration Layer
"""

from ai.config import (
    YOLO_MODEL_PATH,
    DEFAULT_MODEL_NAME,
    DEFAULT_CONF_THRESHOLD,
    DEFAULT_IOU_THRESHOLD
)
from ai.detection_schema import (
    BoundingBox,
    DetectionItem,
    ImageDetectionResponse,
    DetectionHealthResponse
)
from ai.yolo_service import YOLOService, yolo_service

__version__ = "0.2.0"

__all__ = [
    "YOLOService",
    "yolo_service",
    "BoundingBox",
    "DetectionItem",
    "ImageDetectionResponse",
    "DetectionHealthResponse",
    "YOLO_MODEL_PATH",
    "DEFAULT_MODEL_NAME",
    "DEFAULT_CONF_THRESHOLD",
    "DEFAULT_IOU_THRESHOLD"
]
