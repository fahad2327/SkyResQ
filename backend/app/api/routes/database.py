"""
Database Management API Router
Endpoints for database health inspection, records export, and storage management.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from fastapi.responses import JSONResponse

from app.db import (
    get_db_stats,
    export_db_json,
    get_recent_detections,
    clear_detections_table,
    DB_PATH
)

router = APIRouter()


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Get Database Status & Metrics",
    description="Returns SQLite connection status, table row counts, and storage footprint."
)
def get_status() -> Dict[str, Any]:
    """
    Returns live database metrics.
    """
    try:
        return get_db_stats()
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database status error: {str(ex)}"
        )


@router.get(
    "/export",
    status_code=status.HTTP_200_OK,
    summary="Export Complete Project Database",
    description="Exports all persisted detections, missions, and camera nodes as structured JSON."
)
def export_database() -> Dict[str, Any]:
    """
    Exports database records.
    """
    try:
        return export_db_json()
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database export error: {str(ex)}"
        )


@router.get(
    "/detections",
    status_code=status.HTTP_200_OK,
    summary="Query Persisted Detections",
    description="Fetches detections stored in the SQLite database."
)
def get_persisted_detections(
    limit: int = Query(default=50, ge=1, le=500),
    class_name: Optional[str] = Query(default=None)
) -> List[Dict[str, Any]]:
    """
    Returns list of detections from SQLite database.
    """
    try:
        return get_recent_detections(limit=limit, class_name=class_name)
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detections: {str(ex)}"
        )


@router.post(
    "/clear",
    status_code=status.HTTP_200_OK,
    summary="Clear Persisted Detections",
    description="Wipes detections from the database table while preserving schema and missions."
)
def clear_database() -> Dict[str, Any]:
    """
    Clears detection table records.
    """
    try:
        count = clear_detections_table()
        return {
            "success": True,
            "message": f"Cleared {count} detection records from database.",
            "cleared_count": count
        }
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear database: {str(ex)}"
        )
