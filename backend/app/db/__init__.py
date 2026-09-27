"""
SkyResQ Database Package
Manages SQLite connections, schema initialization, and data repositories.
"""

from .database import (
    get_db,
    init_db,
    DB_PATH,
    save_detection,
    get_recent_detections,
    get_detection_counts,
    delete_detection_by_image_id,
    clear_detections_table,
    log_telemetry,
    register_camera_node,
    get_camera_nodes,
    get_db_stats,
    export_db_json
)

__all__ = [
    "get_db",
    "init_db",
    "DB_PATH",
    "save_detection",
    "get_recent_detections",
    "get_detection_counts",
    "delete_detection_by_image_id",
    "clear_detections_table",
    "log_telemetry",
    "register_camera_node",
    "get_camera_nodes",
    "get_db_stats",
    "export_db_json"
]
