"""
Drone Routes
Endpoints providing real and simulated drone telemetry, flight status,
connection protocols, arming, and GPS synchronization.
"""

from fastapi import APIRouter, status
from app.schemas.drone import (
    DroneStatusResponse,
    DroneConnectRequest,
    DroneArmRequest,
    DroneModeRequest,
    DroneTelemetryOverrideRequest,
    DroneActionResponse
)
from app.services.telemetry_service import telemetry_service

router = APIRouter()


@router.get(
    "/status",
    response_model=DroneStatusResponse,
    summary="Get Drone Status",
    description="Returns live drone telemetry, connection protocol, armed state, and GPS coordinates."
)
def get_drone_status() -> DroneStatusResponse:
    """
    Returns live drone telemetry and navigational state from telemetry service.
    """
    return telemetry_service.get_drone_status()


@router.post(
    "/connect",
    response_model=DroneActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Connect Drone Telemetry Link",
    description="Initiates link connection via Simulation, MAVLink Serial, MAVLink UDP, or Device GPS sync."
)
def connect_drone(request: DroneConnectRequest) -> DroneActionResponse:
    """
    Connects to the specified drone telemetry link protocol.
    """
    res = telemetry_service.connect(
        protocol=request.protocol,
        target=request.target,
        baudrate=request.baudrate
    )
    return DroneActionResponse(
        success=res["success"],
        message=res["message"],
        drone_status=telemetry_service.get_drone_status()
    )


@router.post(
    "/disconnect",
    response_model=DroneActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Disconnect Drone Link",
    description="Terminates active telemetry connection and resets drone to Standby."
)
def disconnect_drone() -> DroneActionResponse:
    """
    Disconnects active drone link.
    """
    res = telemetry_service.disconnect()
    return DroneActionResponse(
        success=res["success"],
        message=res["message"],
        drone_status=telemetry_service.get_drone_status()
    )


@router.post(
    "/arm",
    response_model=DroneActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Arm / Disarm Drone",
    description="Toggles drone propulsion arming state."
)
def arm_drone(request: DroneArmRequest) -> DroneActionResponse:
    """
    Arms or disarms drone flight motors.
    """
    is_armed = telemetry_service.set_armed(request.armed)
    action_text = "ARMED (Propulsion Active)" if is_armed else "DISARMED (Motors Safe)"
    return DroneActionResponse(
        success=True,
        message=f"Drone successfully {action_text}.",
        drone_status=telemetry_service.get_drone_status()
    )


@router.post(
    "/mode",
    response_model=DroneActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Set Flight Mode",
    description="Switches drone autonomous or manual flight mode."
)
def set_flight_mode(request: DroneModeRequest) -> DroneActionResponse:
    """
    Switches active drone flight mode.
    """
    mode = telemetry_service.set_flight_mode(request.flight_mode)
    return DroneActionResponse(
        success=True,
        message=f"Flight mode updated to {mode}.",
        drone_status=telemetry_service.get_drone_status()
    )


@router.post(
    "/telemetry/override",
    response_model=DroneActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Override Drone Telemetry with Real Device GPS",
    description="Directly syncs physical device GPS coordinates into drone telemetry."
)
def override_telemetry(request: DroneTelemetryOverrideRequest) -> DroneActionResponse:
    """
    Injects real physical GPS coordinates from browser or external sensor.
    """
    res = telemetry_service.override_telemetry(
        latitude=request.latitude,
        longitude=request.longitude,
        altitude_meters=request.altitude_meters,
        speed_meters_per_second=request.speed_meters_per_second,
        heading_degrees=request.heading_degrees
    )
    return DroneActionResponse(
        success=res["success"],
        message="Drone telemetry synchronized with physical device GPS.",
        drone_status=telemetry_service.get_drone_status()
    )
