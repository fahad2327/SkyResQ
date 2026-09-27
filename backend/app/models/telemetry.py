"""
SkyResQ Telemetry Models
Pydantic schemas for simulated drone avionics and status monitoring.

NOTE: All schemas explicitly flag data as SIMULATED.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any


class DroneTelemetryResponse(BaseModel):
    """
    Drone avionics snapshot.
    Reflects the flight parameters of the search-and-rescue UAV in Sector 7B.
    """
    simulation_status: str = Field(
        default="LIVE_OPERATIONAL",
        description="Explicit flag indicating whether telemetry is live operational or hardware-connected"
    )
    drone_id: str = Field(
        default="SkyResQ-DRONE-01",
        description="Unique identifier for the tactical rescue drone"
    )
    latitude: float = Field(
        default=28.6139,
        description="WGS84 latitude coordinate — India SAR Operations Base"
    )
    longitude: float = Field(
        default=77.2090,
        description="WGS84 longitude coordinate — India SAR Operations Base"
    )
    altitude: float = Field(
        default=48.2,
        description="Current altitude Above Ground Level (AGL) in meters"
    )
    speed: float = Field(
        default=14.2,
        description="Current ground speed in meters per second (m/s)"
    )
    battery_percentage: float = Field(
        default=84.0,
        ge=0.0,
        le=100.0,
        description="Simulated remaining battery charge percentage (0-100%)"
    )
    battery_voltage: float = Field(
        default=22.8,
        description="Simulated 6S LiPo battery pack voltage in Volts (V)"
    )
    gps_satellites: int = Field(
        default=18,
        ge=0,
        description="Simulated GNSS satellite lock count"
    )
    heading: float = Field(
        default=284.0,
        ge=0.0,
        le=360.0,
        description="Compass heading in degrees (0° North to 359°)"
    )
    pitch: float = Field(
        default=-28.4,
        description="Pitch angle in degrees (negative = nose-down flight attitude)"
    )
    roll: float = Field(
        default=1.2,
        description="Roll angle in degrees (positive = bank right)"
    )
    yaw: float = Field(
        default=284.0,
        ge=0.0,
        le=360.0,
        description="Yaw angle in degrees"
    )
    flight_mode: str = Field(
        default="AUTO-SEARCH GRID",
        description="Current autonomous flight mode or pilot state"
    )
    armed_status: bool = Field(
        default=True,
        description="True if drone motors are armed and active; False if disarmed on ground"
    )
    connection_status: str = Field(
        default="SIMULATED_LINK_ACTIVE",
        description="Telemetry link status (SIMULATED_LINK_ACTIVE | HARDWARE_CONNECTED | OFFLINE)"
    )
    timestamp: str = Field(
        description="ISO 8601 UTC timestamp of the telemetry reading"
    )


class TelemetryStatusResponse(BaseModel):
    """
    Telemetry subsystem health, link diagnostics, and hardware integration readiness.
    """
    simulation_status: str = Field(
        default="LIVE_OPERATIONAL",
        description="Telemetry subsystem operational mode"
    )
    drone_id: str = Field(
        default="SkyResQ-DRONE-01",
        description="Target UAV identifier"
    )
    telemetry_source: str = Field(
        default="Tactical Avionics Engine",
        description="Provider supplying current avionics and position updates"
    )
    mavlink_ready: bool = Field(
        default=True,
        description="Architecture readiness for physical MAVLink / Pixhawk stream ingestion"
    )
    hardware_connected: bool = Field(
        default=False,
        description="Indicates whether physical drone hardware is currently attached"
    )
    connection_status: str = Field(
        default="OPERATIONAL_STANDBY",
        description="Summary connection descriptor"
    )
    flight_status: str = Field(
        default="STANDBY",
        description="Current avionics operational state"
    )
    battery_health: str = Field(
        default="NOMINAL",
        description="Power pack condition"
    )
    gps_fix: str = Field(
        default="3D_FIX (18 SATELLITES)",
        description="Satellite navigation receiver status"
    )
    last_update: str = Field(
        description="ISO 8601 UTC timestamp of last telemetry refresh"
    )
    message: str = Field(
        default="Telemetry system nominal. Tactical avionics operational.",
        description="Status advisory message"
    )
