"""
Detection Schemas
Pydantic response and request models for YOLO object detection,
health monitoring, and situational awareness summaries.
"""

from typing import List, Optional
from pydantic import BaseModel, Field



class BoundingBox(BaseModel):
    """Bounding box pixel coordinates [x1, y1, x2, y2]."""
    x1: float = Field(..., description="Top-left X coordinate")
    y1: float = Field(..., description="Top-left Y coordinate")
    x2: float = Field(..., description="Bottom-right X coordinate")
    y2: float = Field(..., description="Bottom-right Y coordinate")
    width: Optional[float] = Field(default=None, description="Bounding box width in pixels")
    height: Optional[float] = Field(default=None, description="Bounding box height in pixels")

    def __init__(self, **data):
        super().__init__(**data)
        if self.width is None:
            self.width = round(abs(self.x2 - self.x1), 2)
        if self.height is None:
            self.height = round(abs(self.y2 - self.y1), 2)


class DetectionItem(BaseModel):
    """Detected target entity."""
    class_id: int = Field(..., description="YOLO class index")
    class_name: str = Field(..., description="Class name (e.g. 'person', 'vehicle', 'hazard')")
    confidence: float = Field(..., description="Confidence score (0.0 to 1.0)")
    bbox: BoundingBox = Field(..., description="Bounding box pixel bounds")
    box: Optional[BoundingBox] = Field(default=None, description="Alias for bbox for dashboard compatibility")

    def __init__(self, **data):
        super().__init__(**data)
        if self.box is None:
            self.box = self.bbox


class ImageDetectionResponse(BaseModel):
    """Standard response format for image detection submissions."""
    success: bool
    mode: str = Field(..., description="'TEST_IMAGE' | 'SIMULATION'")
    data_mode: Optional[str] = Field(default=None, description="Alias for mode")
    source: str = Field(default="uploaded_image")
    image_id: str
    timestamp: str
    model_name: str
    model_used: Optional[str] = Field(default=None, description="Active YOLO model weights filename")
    confidence_threshold: float
    conf_threshold: Optional[float] = Field(default=None, description="Alias for confidence threshold")
    detections: List[DetectionItem] = []
    total_detections: int = 0
    person_detections: int = 0
    hazard_detections: int = 0
    image_width: int = 0
    image_height: int = 0
    annotated_image_url: Optional[str] = None
    latitude: Optional[float] = Field(default=None, description="GPS latitude where target was localized")
    longitude: Optional[float] = Field(default=None, description="GPS longitude where target was localized")
    is_real_gps: bool = Field(default=False, description="True if coordinates are from physical device GPS")
    error: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.data_mode is None:
            self.data_mode = self.mode
        if self.model_used is None:
            self.model_used = self.model_name
        if self.conf_threshold is None:
            self.conf_threshold = self.confidence_threshold


class DetectionHealthResponse(BaseModel):
    """Health and model availability diagnostic response."""
    status: str = "ok"
    service: str = "yolo-detection"
    yolo_service_ready: bool = True
    package_available: bool
    model_exists: bool
    model_loaded: bool
    model_name: str
    active_model: Optional[str] = None
    detection_mode: str
    engine: str = "ultralytics_yolov8"

    def __init__(self, **data):
        super().__init__(**data)
        if self.active_model is None:
            self.active_model = self.model_name
        self.yolo_service_ready = self.package_available and self.model_exists


class DetectionHistoryItem(BaseModel):
    """Archival record of a past detection run."""
    image_id: str
    filename: str
    original_filename: Optional[str] = None
    timestamp: str
    mode: str
    data_mode: Optional[str] = None
    total_detections: int
    person_count: int
    person_detections: int = 0
    hazard_count: int
    hazard_detections: int = 0
    annotated_image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_real_gps: bool = False
    model_used: Optional[str] = None
    conf_threshold: Optional[float] = None
    source_type: Optional[str] = "drone_rgb"
    notes: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.original_filename is None:
            self.original_filename = self.filename
        if self.data_mode is None:
            self.data_mode = self.mode
        if not self.person_detections:
            self.person_detections = self.person_count
        if not self.hazard_detections:
            self.hazard_detections = self.hazard_count


class DetectionSummaryResponse(BaseModel):
    """Aggregate situational awareness metrics for the mission dashboard."""
    data_mode: str
    victims_detected: int
    hazards_detected: int
    last_detection_time: Optional[str] = None
    total_detections: int = 0

