"""
System Schemas
Pydantic response models for system metadata and health information.
"""

from pydantic import BaseModel


class SystemInfoResponse(BaseModel):
    service: str
    version: str
    environment: str
    data_mode: str
