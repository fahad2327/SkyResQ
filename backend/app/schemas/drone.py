from typing import Optional
from pydantic import BaseModel, Field


class DroneStatusResponse(BaseModel):
    drone_id: str = Field(default="SkyResQ-DRONE-01")
    connection_status: str = Field(default="operational")
    protocol: str = Field(default="READY", description="Active protocol: READY | MAVLINK_SERIAL | MAVLINK_UDP | DEVICE_GPS_SYNC")
    connection_target: Optional[str] = Field(default=None, description="COM port or IP:port")
    armed: bool = Field(default=False)
    flight_mode: str = Field(default="STANDBY")
    battery_percentage: int = Field(default=85)
    voltage: float = Field(default=15.2)
    latitude: float = Field(default=28.6139, description="WGS84 latitude coordinate (India SAR base)")
    longitude: float = Field(default=77.2090, description="WGS84 longitude coordinate (India SAR base)")
    altitude_meters: float = Field(default=48.2)
    speed_meters_per_second: float = Field(default=14.2)
    heading_degrees: float = Field(default=284.0)
    pitch: float = Field(default=0.0)
    roll: float = Field(default=0.0)
    yaw: float = Field(default=284.0)
    satellites: int = Field(default=18)
    link_quality: int = Field(default=98, description="Link quality percentage 0-100")
    gps_accuracy_meters: float = Field(default=0.0, description="GPS horizontal accuracy in metres (0 = unknown)")
    is_real_gps: bool = Field(default=False, description="True if coordinates are from real physical device GPS")
    hardware_connected: bool = Field(default=False, description="True if physical or telemetry drone link is established")
    timestamp: str = Field(default="")


class DroneConnectRequest(BaseModel):
    protocol: str = Field(default="READY", description="READY | MAVLINK_SERIAL | MAVLINK_UDP | DEVICE_GPS_SYNC")
    target: Optional[str] = Field(default=None, description="e.g. COM3 or 127.0.0.1:14550")
    baudrate: Optional[int] = Field(default=57600)


class DroneArmRequest(BaseModel):
    armed: bool = Field(default=True)


class DroneModeRequest(BaseModel):
    flight_mode: str = Field(default="AUTO-SEARCH", description="STANDBY | AUTO-SEARCH | LOITER | RTL | MANUAL | LAND")


class DroneTelemetryOverrideRequest(BaseModel):
    latitude: float
    longitude: float
    altitude_meters: Optional[float] = None
    speed_meters_per_second: Optional[float] = None
    heading_degrees: Optional[float] = None
    gps_accuracy_meters: Optional[float] = None
    connection_status: Optional[str] = None
    flight_mode: Optional[str] = None


class DroneActionResponse(BaseModel):
    success: bool
    message: str
    drone_status: DroneStatusResponse
