"""
SkyResQ Detection Models
Pydantic schemas for object detection, casualty identification, and situational awareness.

Supports:
- Detection ID
- Object class (e.g. person, hazard, vehicle)
- Confidence score (0.0 to 1.0)
- Bounding box coordinates [x1, y1, x2, y2]
- Detection timestamp (ISO 8601 UTC)
- Optional image reference (URL, path, or base64)
- Geodetic coordinates (latitude, longitude)
- Simulation vs real-data status
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """
    Bounding box coordinates in either normalized (0.0-1.0) or pixel format.
    [x1, y1, x2, y2] representing top-left and bottom-right corners.
    """
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


class DetectionCreate(BaseModel):
    """
    Payload sent by an external Python YOLO model or detection script.
    """
    class_name: str = Field(
        ...,
        description="Target class identified by YOLO (e.g., 'person', 'hazard', 'fire', 'vehicle')"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score from YOLO detector (0.0 to 1.0)"
    )
    bbox: BoundingBox = Field(
        ...,
        description="Bounding box coordinates in image space"
    )
    image_reference: Optional[str] = Field(
        default=None,
        description="Optional image URL, file path, or base64 thumbnail"
    )
    latitude: Optional[float] = Field(
        default=None,
        description="Geodetic latitude of detection location, if georeferenced"
    )
    longitude: Optional[float] = Field(
        default=None,
        description="Geodetic longitude of detection location, if georeferenced"
    )
    is_simulated: bool = Field(
        default=True,
        description="Explicit flag indicating whether detection is synthetic or from live optical camera"
    )
    source_type: str = Field(
        default="simulation",
        description="Stream source type: 'image' | 'video' | 'webcam' | 'rtsp' | 'simulation'"
    )
    source_model: Optional[str] = Field(
        default="YOLOv8-SAR-Custom",
        description="Name or version of the inference model"
    )


class DetectionResponse(BaseModel):
    """
    Full detection record returned by the SkyResQ API.
    """
    detection_id: str = Field(
        ...,
        description="Unique identifier for the detection event (e.g., 'DET-001')"
    )
    class_name: str = Field(
        ...,
        description="Target class identified (e.g. 'person', 'hazard')"
    )
    confidence: float = Field(
        ...,
        description="Detection confidence score (0.0 to 1.0)"
    )
    bbox: BoundingBox = Field(
        ...,
        description="Bounding box coordinates"
    )
    timestamp: str = Field(
        ...,
        description="ISO 8601 UTC timestamp of detection"
    )
    image_reference: Optional[str] = Field(
        default=None,
        description="Image thumbnail reference or filename"
    )
    latitude: Optional[float] = Field(
        default=None,
        description="Latitude of target"
    )
    longitude: Optional[float] = Field(
        default=None,
        description="Longitude of target"
    )
    is_simulated: bool = Field(
        default=True,
        description="True if synthetic simulation data, False if from real sensor feed"
    )
    source_type: str = Field(
        default="simulation",
        description="Stream source type: 'image' | 'video' | 'webcam' | 'rtsp' | 'simulation'"
    )
    status: str = Field(
        default="CONFIRMED",
        description="Operational status: 'CONFIRMED' | 'INVESTIGATING' | 'RESOLVED'"
    )
    source_model: Optional[str] = Field(
        default="YOLOv8-SAR-Custom",
        description="Detector model identifier"
    )


class DetectionSummaryResponse(BaseModel):
    """
    Aggregated situational awareness metrics for the mission dashboard.
    """
    total_detections: int = Field(
        ...,
        description="Total number of logged detections in current mission"
    )
    total_persons: int = Field(
        ...,
        description="Total detected human casualties / persons located"
    )
    total_hazards: int = Field(
        ...,
        description="Total detected environmental hazards / hot spots"
    )
    latest_detection: Optional[DetectionResponse] = Field(
        default=None,
        description="The most recent detection recorded"
    )
    is_simulation: bool = Field(
        default=True,
        description="Indicates whether detection subsystem is operating with synthetic data"
    )
    last_updated: str = Field(
        ...,
        description="ISO 8601 UTC timestamp of last summary recalculation"
    )
