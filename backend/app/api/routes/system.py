"""
System Routes
Endpoints for system information and operational environment metadata.
"""

from fastapi import APIRouter
from app.schemas.system import SystemInfoResponse
from app.core.config import settings

router = APIRouter()


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    summary="Get System Information",
    description="Returns service metadata, version, environment, and current data mode."
)
def get_system_info() -> SystemInfoResponse:
    """
    Returns system identification and operational configuration.
    """
    return SystemInfoResponse(
        service="skyresq-backend",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        data_mode=settings.DATA_MODE
    )
