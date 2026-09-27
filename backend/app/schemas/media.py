"""
Media Schemas
Pydantic response models for camera and video feed status.
"""

from pydantic import BaseModel


class MediaStatusResponse(BaseModel):
    rgb_camera: str
    thermal_camera: str
    stream_status: str
    data_mode: str
