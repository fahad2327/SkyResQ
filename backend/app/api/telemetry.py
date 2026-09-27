"""
SkyResQ Telemetry API Router
Endpoints for retrieving simulated drone avionics and link diagnostics.

NOTE: All responses are explicitly flagged as SIMULATION data.
"""

from fastapi import APIRouter, status
from app.models.telemetry import DroneTelemetryResponse, TelemetryStatusResponse
from app.services.telemetry_service import telemetry_service

router = APIRouter(
    prefix="/telemetry",
    tags=["Drone Telemetry (Simulated)"]
)


@router.get(
    "/current",
    response_model=DroneTelemetryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Drone Telemetry (Simulated)",
    description=(
        "Retrieves a live simulated avionics snapshot for SkyResQ drone. "
        "Includes coordinates, altitude, ground speed, battery voltage/percentage, "
        "compass heading, flight attitude (pitch/roll/yaw), and armed status. "
        "Explicitly flagged as [SIMULATION] data."
    )
)
def get_current_telemetry() -> DroneTelemetryResponse:
    """
    Returns the latest simulated drone flight telemetry snapshot.
    """
    return telemetry_service.get_current_telemetry()


@router.get(
    "/status",
    response_model=TelemetryStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Telemetry Subsystem Status & Diagnostics",
    description=(
        "Returns the operational diagnostics of the drone telemetry subsystem, "
        "indicating simulation mode, MAVLink ingestion readiness, GPS fix condition, "
        "and physical hardware connection status."
    )
)
def get_telemetry_status() -> TelemetryStatusResponse:
    """
    Returns telemetry subsystem link condition and architecture readiness.
    """
    return telemetry_service.get_telemetry_status()
