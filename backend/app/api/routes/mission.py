"""
Mission Routes
Endpoints providing simulated search and rescue mission status and details.
"""

from fastapi import APIRouter
from app.schemas.mission import MissionCurrentResponse

router = APIRouter()


@router.get(
    "/current",
    response_model=MissionCurrentResponse,
    summary="Get Current Mission",
    description="Returns the currently active or standby simulated mission."
)
def get_current_mission() -> MissionCurrentResponse:
    """
    Returns simulated search and rescue mission details.
    """
    return MissionCurrentResponse(
        mission_id="SAR-MISSION-01",
        status="active",
        data_mode="live_operational",
        target_area="Tactical Sector 7B Grid"
    )
