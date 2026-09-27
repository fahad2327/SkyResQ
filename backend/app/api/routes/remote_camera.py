"""
Remote Mobile Camera Stream API Router
Manages remote mobile camera ingestion, frame streaming from smartphone companion nodes,
live YOLO inference over mobile video feeds, and feed distribution to the laptop dashboard.
"""

import time
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel, Field

from app.services.detection_service import detection_service
from app.db import register_camera_node, get_camera_nodes

router = APIRouter()

# In-memory buffer for the latest mobile camera frame & inference state
class RemoteCameraBuffer:
    def __init__(self):
        self.device_id: Optional[str] = None
        self.device_name: str = "Mobile Camera Node"
        self.device_type: str = "mobile_camera"
        self.camera_facing: str = "environment"
        self.last_frame_time: float = 0.0
        self.frame_count: int = 0
        self.fps: float = 0.0
        self.last_fps_calc_time: float = time.time()
        self.frames_in_interval: int = 0
        self.latest_result: Optional[Dict[str, Any]] = None
        self.is_active: bool = False

    def update_frame(self, device_id: str, device_name: str, facing: str, result: Dict[str, Any]):
        now = time.time()
        self.device_id = device_id
        self.device_name = device_name
        self.camera_facing = facing
        self.last_frame_time = now
        self.frame_count += 1
        self.frames_in_interval += 1
        self.latest_result = result
        self.is_active = True

        # Calculate streaming FPS
        if now - self.last_fps_calc_time >= 1.0:
            self.fps = round(self.frames_in_interval / (now - self.last_fps_calc_time), 1)
            self.frames_in_interval = 0
            self.last_fps_calc_time = now

    def check_active(self) -> bool:
        # If no frame received in the last 6 seconds, mark as offline/standby
        if time.time() - self.last_frame_time > 6.0:
            self.is_active = False
            self.fps = 0.0
        return self.is_active

    def get_status(self) -> Dict[str, Any]:
        active = self.check_active()
        return {
            "is_active": active,
            "device_id": self.device_id,
            "device_name": self.device_name,
            "device_type": self.device_type,
            "camera_facing": self.camera_facing,
            "fps": self.fps if active else 0.0,
            "frame_count": self.frame_count,
            "last_frame_age_seconds": round(time.time() - self.last_frame_time, 1) if self.last_frame_time > 0 else None,
            "latest_result": self.latest_result if active else None
        }


remote_buffer = RemoteCameraBuffer()


@router.post(
    "/frame",
    status_code=status.HTTP_200_OK,
    summary="Ingest Frame from Mobile Camera Companion",
    description="Receives an image frame from a mobile device, runs YOLO detection, updates live feed buffer, and saves to database."
)
async def ingest_mobile_frame(
    file: UploadFile = File(..., description="Camera frame image (JPEG or PNG)"),
    device_id: str = Form(default="mobile-node-01"),
    device_name: str = Form(default="SkyResQ Mobile Companion"),
    camera_facing: str = Form(default="environment"),
    conf_threshold: float = Form(default=0.25),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None)
) -> Dict[str, Any]:
    """
    Ingests a camera frame from a mobile device, executes YOLO inference,
    registers the node in the database, and stores the latest frame for laptop consumption.
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty frame received"
            )

        # Register camera node in database
        register_camera_node(
            device_id=device_id,
            device_name=device_name,
            device_type="mobile_camera",
            ip_address=None
        )

        # Process frame through YOLO detection service
        # Set source to mobile_camera
        filename = f"mobilecam_{device_id}_{int(time.time() * 1000)}.jpg"
        result = detection_service.process_image(
            file_bytes=contents,
            original_filename=filename,
            conf_threshold=conf_threshold,
            latitude=latitude,
            longitude=longitude,
            source_type="mobile_camera"
        )

        res_dict = result.model_dump()
        remote_buffer.update_frame(
            device_id=device_id,
            device_name=device_name,
            facing=camera_facing,
            result=res_dict
        )

        return {
            "success": True,
            "device_id": device_id,
            "fps": remote_buffer.fps,
            "data": res_dict
        }

    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process mobile frame: {str(ex)}"
        )


@router.get(
    "/latest",
    status_code=status.HTTP_200_OK,
    summary="Get Latest Mobile Camera Feed & Annotations",
    description="Used by the laptop dashboard to display the live feed and detection overlay from the mobile phone."
)
def get_latest_remote_frame() -> Dict[str, Any]:
    """
    Returns the latest frame and detection results for the laptop dashboard.
    """
    return remote_buffer.get_status()


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Get Mobile Camera Streaming Status",
    description="Returns whether a mobile camera device is currently connected and streaming."
)
def get_remote_status() -> Dict[str, Any]:
    """
    Returns connection and streaming state.
    """
    return {
        **remote_buffer.get_status(),
        "registered_nodes": get_camera_nodes()
    }
