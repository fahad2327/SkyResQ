"""
SkyResQ Video Stream API Router
Endpoints for managing video and camera ingestion sources (local video, webcam, simulation).
"""

from fastapi import APIRouter, HTTPException, status
from app.models.video import VideoConfigRequest, VideoStatusResponse
from ai.video.video_stream_service import video_stream_service

router = APIRouter(
    prefix="/video",
    tags=["Video & Camera Ingestion"]
)


@router.get(
    "/status",
    response_model=VideoStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Video Ingestion Status",
    description="Returns the current operational status, active video input source, FPS, and frame count."
)
def get_video_status() -> VideoStatusResponse:
    """
    Returns live video stream telemetry and source configuration.
    """
    return VideoStatusResponse(**video_stream_service.get_status())


@router.post(
    "/source",
    response_model=VideoStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Set Video Source",
    description="Configures the active video input source: 'simulation', 'video', 'webcam', or 'rtsp'."
)
def set_video_source(payload: VideoConfigRequest) -> VideoStatusResponse:
    """
    Switches the video ingestion source (e.g. from simulation to local video or webcam).
    """
    try:
        updated = video_stream_service.configure(
            source_type=payload.source_type,
            source_path=payload.source_path,
            conf_threshold=payload.conf_threshold
        )
        return VideoStatusResponse(**updated)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf)
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure video source: {str(ex)}"
        )


@router.post(
    "/start",
    response_model=VideoStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Start Video Stream",
    description="Starts reading video frames and streaming detections to the backend."
)
def start_video_stream() -> VideoStatusResponse:
    """
    Initiates video ingestion worker thread.
    """
    result = video_stream_service.start()
    return VideoStatusResponse(**result)


@router.post(
    "/stop",
    response_model=VideoStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Stop Video Stream",
    description="Halts the active video stream capture."
)
def stop_video_stream() -> VideoStatusResponse:
    """
    Stops the active video ingestion worker.
    """
    result = video_stream_service.stop()
    return VideoStatusResponse(**result)


@router.post(
    "/process-frame",
    status_code=status.HTTP_200_OK,
    summary="Process Single Frame",
    description="Extracts and processes a single frame synchronously from the configured source."
)
def process_single_frame():
    """
    Triggers one-shot frame processing.
    """
    try:
        detections = video_stream_service.process_single_frame()
        return {
            "status": "success",
            "source_type": video_stream_service.source_type,
            "processed_detections": detections,
            "count": len(detections)
        }
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Frame processing failed: {str(ex)}"
        )
