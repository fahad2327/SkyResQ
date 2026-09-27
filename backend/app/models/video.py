"""
SkyResQ Video Ingestion Models
Pydantic schemas for video stream configuration, source selection, and status reporting.
"""

from pydantic import BaseModel, Field
from typing import Optional


class VideoConfigRequest(BaseModel):
    """
    Request payload to set or switch the video ingestion source.
    """
    source_type: str = Field(
        ...,
        description="Source stream type: 'simulation' | 'video' | 'webcam' | 'rtsp'"
    )
    source_path: Optional[str] = Field(
        default=None,
        description="Path to local video file, device index (e.g. '0'), or RTSP stream URL"
    )
    conf_threshold: float = Field(
        default=0.50,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for YOLO detection filtering"
    )


class VideoStatusResponse(BaseModel):
    """
    Operational status of the video ingestion service and camera feed.
    """
    source_type: str = Field(
        default="simulation",
        description="Active input stream: 'simulation' | 'video' | 'webcam' | 'rtsp'"
    )
    source_path: Optional[str] = Field(
        default=None,
        description="Path or identifier of current video source"
    )
    status: str = Field(
        default="IDLE",
        description="Stream operational status: 'IDLE' | 'STREAMING' | 'PAUSED' | 'ERROR'"
    )
    fps: float = Field(
        default=0.0,
        description="Current effective frames-per-second processing rate"
    )
    frame_count: int = Field(
        default=0,
        description="Total video frames processed in current session"
    )
    detections_count: int = Field(
        default=0,
        description="Total target detections identified from this video source"
    )
    is_hardware_camera: bool = Field(
        default=False,
        description="True if input is from a physical camera device; False if synthetic or file"
    )
    is_simulation: bool = Field(
        default=True,
        description="True if running synthetic/simulation video frames"
    )
    last_error: Optional[str] = Field(
        default=None,
        description="Most recent error message or failure description if any"
    )
    message: str = Field(
        default="Video service initialized.",
        description="Human-readable status summary"
    )
