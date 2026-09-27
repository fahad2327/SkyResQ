"""
Detection Routes
Endpoints for image detection submission, YOLO health diagnostics,
history retrieval, and situational awareness summary metrics.
"""

from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, status

from app.schemas.detection import (
    ImageDetectionResponse,
    DetectionHealthResponse,
    DetectionHistoryItem,
    DetectionSummaryResponse
)
from app.services.detection_service import detection_service

router = APIRouter()


@router.post(
    "/image",
    response_model=ImageDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit Image for YOLO Detection",
    description="Uploads an image, executes YOLO object detection, generates annotated visual, and logs results."
)
async def detect_image(
    file: UploadFile = File(..., description="Image file to analyze (JPEG, PNG, WEBP)"),
    conf_threshold: float = Form(default=0.25, ge=0.05, le=1.0, description="Confidence detection threshold"),
    latitude: Optional[float] = Form(default=None, description="Optional GPS latitude"),
    longitude: Optional[float] = Form(default=None, description="Optional GPS longitude")
) -> ImageDetectionResponse:
    """
    Analyzes an uploaded image using the YOLO detection subsystem.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename must not be empty"
        )

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty"
            )

        result = detection_service.process_image(
            file_bytes=contents,
            original_filename=file.filename,
            conf_threshold=conf_threshold,
            latitude=latitude,
            longitude=longitude
        )
        return result

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline execution error: {str(exc)}"
        )


@router.get(
    "/health",
    response_model=DetectionHealthResponse,
    summary="Get Detection Subsystem Health",
    description="Returns YOLO package availability, model file existence, loaded status, and operational mode."
)
def get_detection_health() -> DetectionHealthResponse:
    """
    Returns diagnostic and operational readiness metrics for the YOLO vision service.
    """
    return detection_service.get_health()


@router.get(
    "/history",
    response_model=List[DetectionHistoryItem],
    summary="Get Detection History",
    description="Returns recent image detection records and situational logs."
)
def get_detection_history(
    limit: int = Query(default=20, ge=1, le=50, description="Maximum number of historical records to return")
) -> List[DetectionHistoryItem]:
    """
    Retrieves the most recent detection events.
    """
    return detection_service.get_history(limit=limit)


@router.get(
    "/summary",
    response_model=DetectionSummaryResponse,
    summary="Get Detection Summary",
    description="Returns live aggregate counts of detected persons and hazards."
)
def get_detection_summary() -> DetectionSummaryResponse:
    """
    Returns aggregate situational awareness metrics for the mission dashboard.
    """
    return detection_service.get_summary()


@router.post(
    "/clear",
    response_model=DetectionSummaryResponse,
    summary="Clear Recorded Detections",
    description="Resets the in-memory detection log and person counters to zero."
)
def clear_detections() -> DetectionSummaryResponse:
    """
    Clears all recorded casualties and targets, resetting counts to 0.
    """
    detection_service.clear()
    return detection_service.get_summary()


@router.post(
    "/reset",
    response_model=DetectionSummaryResponse,
    summary="Reset Detection Metrics",
    description="Alias for clearing detections."
)
def reset_detections() -> DetectionSummaryResponse:
    detection_service.clear()
    return detection_service.get_summary()


@router.delete(
    "/history/{image_id}",
    summary="Delete Detection Run",
    description="Deletes a specific detection run record and associated image files from disk."
)
def delete_detection_run(image_id: str):
    success = detection_service.delete_history_item(image_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection run '{image_id}' not found"
        )
    return {"success": True, "deleted_id": image_id, "summary": detection_service.get_summary()}


@router.delete(
    "/history",
    summary="Clear Detection History",
    description="Deletes all historical detection records and associated captured images from disk."
)
def clear_detection_history():
    detection_service.clear()
    return {"success": True, "message": "All detection history and captured images cleared"}


