"""
Media Routes
Endpoints providing camera feed availability and video stream status.
"""

from fastapi import APIRouter
from app.schemas.media import MediaStatusResponse

router = APIRouter()


@router.get(
    "/status",
    response_model=MediaStatusResponse,
    summary="Get Media and Camera Status",
    description="Returns connection status for optical RGB, thermal cameras, and video streams."
)
def get_media_status() -> MediaStatusResponse:
    """
    Returns simulated camera connection and video stream statuses.
    """
    return MediaStatusResponse(
        rgb_camera="ready",
        thermal_camera="not_connected",
        stream_status="available",
        data_mode="live_operational"
    )
