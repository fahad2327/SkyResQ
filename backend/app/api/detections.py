"""
SkyResQ Detection API Router
REST endpoints for retrieving detections, summary metrics, and ingesting YOLO inference data.

Supports:
- GET  /api/v1/detections
- GET  /api/v1/detections/latest
- GET  /api/v1/detections/summary
- POST /api/v1/detections
"""

from typing import List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from app.models.detection import (
    DetectionCreate,
    DetectionResponse,
    DetectionSummaryResponse
)
from app.services.detection_service import detection_service

router = APIRouter(
    prefix="/detections",
    tags=["AI Object Detection (YOLO)"]
)


@router.get(
    "",
    response_model=List[DetectionResponse],
    status_code=status.HTTP_200_OK,
    summary="List Recent Detections",
    description=(
        "Retrieves a list of recent object detections recorded by the YOLO AI vision system "
        "or simulated targets in Sector 7B. Supports optional class filtering and result limits."
    )
)
def get_detections(
    limit: int = Query(default=20, ge=1, le=100, description="Max detections to return"),
    class_name: Optional[str] = Query(default=None, description="Filter by class (e.g. 'person', 'hazard')")
) -> List[DetectionResponse]:
    """
    Returns list of recorded detections.
    """
    return detection_service.get_all(limit=limit, class_name=class_name)


@router.get(
    "/latest",
    response_model=Optional[DetectionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Most Recent Detection",
    description=(
        "Retrieves the single most recent detection event recorded by the system. "
        "Returns null if no detections have been logged."
    )
)
def get_latest_detection() -> Optional[DetectionResponse]:
    """
    Returns the newest detection snapshot.
    """
    return detection_service.get_latest()


@router.get(
    "/summary",
    response_model=DetectionSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Detection Summary & Mission Metrics",
    description=(
        "Retrieves high-level situational awareness metrics for the mission dashboard: "
        "total detections, total persons located, total hazards identified, and latest target info."
    )
)
def get_detection_summary() -> DetectionSummaryResponse:
    """
    Returns aggregated detection counts and latest event for the dashboard cards.
    """
    return detection_service.get_summary()


@router.post(
    "",
    response_model=DetectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Detection from Python YOLO System",
    description=(
        "Receives a new detection event from an external Python YOLO script or camera vision pipeline. "
        "Accepts bounding box coordinates, confidence score, class name, and georeference coordinates."
    )
)
def create_detection(payload: DetectionCreate) -> DetectionResponse:
    """
    Ingest endpoint for external Python YOLO systems to post detections into SkyResQ.
    """
    try:
        new_detection = detection_service.add_detection(payload)
        return new_detection
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process detection: {str(e)}"
        )


@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Clear Recorded Detections",
    description="Resets the in-memory detection log. Useful for resetting test runs and mission simulations."
)
def clear_detections():
    """
    Clears all detections from the in-memory store.
    """
    cleared_count = detection_service.clear_all()
    return {
        "status": "success",
        "message": f"Cleared {cleared_count} detections.",
        "cleared_count": cleared_count
    }
