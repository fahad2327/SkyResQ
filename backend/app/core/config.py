"""
Core Application Configuration
Centralized configuration settings for the SkyResQ backend.
"""

import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "SkyResQ Independent API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "AI-powered aerial rescue and situational awareness backend"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "operational"
    DATA_MODE: str = "live_operational"
    
    # Persistent Database Configuration
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Path(os.environ.get("SKYRESQ_DATA_DIR", str(PROJECT_ROOT / "data")))
    DB_PATH: Path = DATA_DIR / "skyresq.db"

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

