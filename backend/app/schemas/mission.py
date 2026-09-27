"""
Mission Schemas
Pydantic response models for search and rescue mission data.
"""

from pydantic import BaseModel


class MissionCurrentResponse(BaseModel):
    mission_id: str
    status: str
    data_mode: str
    target_area: str
