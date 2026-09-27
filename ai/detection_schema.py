"""
SkyResQ Detection Schema
Pydantic schemas and standard data structures for YOLO object detection.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Bounding box pixel coordinates [x1, y1, x2, y2]."""
    x1: float = Field(..., description="Top-left X coordinate")
    y1: float = Field(..., description="Top-left Y coordinate")
    x2: float = Field(..., description="Bottom-right X coordinate")
    y2: float = Field(..., description="Bottom-right Y coordinate")

    @property
    def width(self) -> float:
        return abs(self.x2 - self.x1)

    @property
    def height(self) -> float:
        return abs(self.y2 - self.y1)


class DetectionItem(BaseModel):
    """Individual object detection item identified by YOLO."""
    class_id: int = Field(..., description="Integer class identifier")
    class_name: str = Field(..., description="Object class label (e.g. 'person', 'vehicle', 'hazard')")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    bbox: BoundingBox = Field(..., description="Bounding box pixel coordinates")


class ImageDetectionResponse(BaseModel):
    """
    Standard detection output format for SkyResQ AI inference.
    Guarantees pure Python types suitable for JSON serialization.
    """
    success: bool = Field(..., description="Whether inference completed successfully")
    mode: str = Field(..., description="'TEST_IMAGE' | 'SIMULATION'")
    source: str = Field(default="uploaded_image", description="Origin of input (e.g. 'uploaded_image')")
    image_id: str = Field(..., description="Unique tracking identifier for the image")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    model_name: str = Field(..., description="Name or identifier of the YOLO model used")
    confidence_threshold: float = Field(..., description="Confidence threshold used during inference")
    detections: List[DetectionItem] = Field(default_factory=list, description="List of detected objects")
    total_detections: int = Field(default=0, description="Total count of detected objects")
    annotated_image_url: Optional[str] = Field(default=None, description="URL or relative path to annotated visual")
    error: Optional[str] = Field(default=None, description="Error message if inference or loading failed")


class DetectionHealthResponse(BaseModel):
    """System and operational status of the AI YOLO detection module."""
    status: str = Field(default="ok", description="Service status: 'ok' | 'degraded' | 'unavailable'")
    service: str = Field(default="yolo-detection", description="Identifier of the service")
    package_available: bool = Field(..., description="Whether ultralytics is installed")
    model_exists: bool = Field(..., description="Whether configured model weight file exists on disk")
    model_loaded: bool = Field(..., description="Whether YOLO model is currently instantiated in memory")
    model_name: str = Field(..., description="Configured model name or file path")
    detection_mode: str = Field(..., description="'TEST_IMAGE' or 'SIMULATION'")
