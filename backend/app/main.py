"""
SkyResQ Independent API - Initial FastAPI Backend
AI-powered aerial rescue and situational awareness backend.
"""

import sys
import os
from pathlib import Path

# Ensure both backend directory and project root are in sys.path
_current_dir = Path(__file__).resolve().parent  # app/
_backend_dir = _current_dir.parent  # backend/
_root_dir = _backend_dir.parent  # project root/

for _p in [str(_backend_dir), str(_root_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from typing import Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.db import init_db

# Initialize database tables and migrations BEFORE route controllers load
init_db()

from app.api.routes import api_router

# Initialize FastAPI application with specified metadata
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)


# Enable CORS for frontend integration (Vercel, Render, Mobile devices, and Localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular v1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount media files for serving annotated detection images
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles

from fastapi import Request
from fastapi.responses import FileResponse

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = Path(os.environ.get("SKYRESQ_MEDIA_DIR", str(PROJECT_ROOT / "media")))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "uploads").mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "detections").mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

FRONTEND_DIR = Path(os.environ.get("SKYRESQ_FRONTEND_DIR", str(PROJECT_ROOT / "frontend")))


class RootResponse(BaseModel):
    message: str
    service: str
    version: str


class HealthResponse(BaseModel):
    status: str
    service: str
    mode: str


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["General"],
    summary="Service Health Check"
)
def health_check() -> HealthResponse:
    """
    Health check endpoint returning system operational status.
    """
    return HealthResponse(
        status="ok",
        service="skyresq-backend",
        mode=os.environ.get("SKYRESQ_ENV", "production")
    )


@app.get(
    "/",
    tags=["General"],
    summary="Root Service or Mission Control Portal"
)
def read_root(request: Request):
    """
    Dual-mode root endpoint:
    - Returns full SkyResQ Mission Control HTML in browser
    - Returns service status JSON for API / programmatic clients
    """
    accept = request.headers.get("accept", "")
    index_file = FRONTEND_DIR / "index.html"
    if "text/html" in accept and index_file.exists():
        return FileResponse(str(index_file))

    return RootResponse(
        message="SkyResQ Defense Mission Control API is operational",
        service="skyresq-backend",
        version="1.0.0"
    )


# Mount static frontend directories for unified single-port cloud or local deployment
if FRONTEND_DIR.exists():
    for sub in ["css", "js", "assets"]:
        subdir = FRONTEND_DIR / sub
        if subdir.exists():
            app.mount(f"/{sub}", StaticFiles(directory=str(subdir)), name=f"static_{sub}")

    # Also mount /mobile-cam.html route
    @app.get("/mobile-cam.html", include_in_schema=False)
    def serve_mobile_cam():
        mobile_file = FRONTEND_DIR / "mobile-cam.html"
        if mobile_file.exists():
            return FileResponse(str(mobile_file))
        return {"error": "mobile-cam.html not found"}

