"""
SkyResQ AI Configuration
Settings, threshold presets, and target class mappings for YOLO inference.
"""

import os
from pathlib import Path
from typing import Optional, Dict, List, Set

# Base directory paths
AI_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(AI_BASE_DIR)
MODELS_DIR = os.path.join(AI_BASE_DIR, "models")

# Model paths and defaults - Automatically prioritizes yolov8_custom.pt > yolov8s.pt > yolov8n.pt
CUSTOM_MODEL_PATH = os.path.join(MODELS_DIR, "yolov8_custom.pt")
S_MODEL_PATH = os.path.join(MODELS_DIR, "yolov8s.pt")
N_MODEL_PATH = os.path.join(MODELS_DIR, "yolov8n.pt")

if os.path.exists(CUSTOM_MODEL_PATH):
    DEFAULT_MODEL_NAME = "yolov8_custom.pt"
elif os.path.exists(S_MODEL_PATH):
    DEFAULT_MODEL_NAME = "yolov8s.pt"
else:
    DEFAULT_MODEL_NAME = "yolov8n.pt"

DEFAULT_MODEL_PATH = os.path.join(MODELS_DIR, DEFAULT_MODEL_NAME)
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", DEFAULT_MODEL_PATH)

# Search and Rescue Priority Class IDs (None or empty means detect ALL available classes)
SAR_TARGET_CLASS_IDS: Optional[List[int]] = None

# Inference thresholds
DEFAULT_CONFIDENCE_THRESHOLD = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.25"))
DEFAULT_CONF_THRESHOLD = DEFAULT_CONFIDENCE_THRESHOLD
DEFAULT_IOU_THRESHOLD = float(os.environ.get("YOLO_IOU_THRESHOLD", "0.45"))

# Allowed image file formats & limits
ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_IMAGE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB

# Supported source stream types
SUPPORTED_SOURCES = ("image", "video", "webcam", "rtsp", "simulation")

# Primary SAR target categories
CATEGORY_PERSON = "person"
CATEGORY_VEHICLE = "vehicle"
CATEGORY_HAZARD = "hazard"
CATEGORY_FIRE = "fire"
CATEGORY_OBJECT = "object"
CATEGORY_OTHER = "other"

PERSON_CLASS_NAMES: Set[str] = {CATEGORY_PERSON, "person", "human", "survivor", "casualty"}
HAZARD_CLASS_NAMES: Set[str] = {CATEGORY_FIRE, CATEGORY_HAZARD, "fire", "smoke", "fire hazard"}

# Friendly name formatting for COCO and custom objects
CLASS_NAME_MAPPINGS: Dict[str, str] = {
    "person": "Person",
    "cell phone": "Smart Phone",
    "laptop": "Laptop",
    "tv": "Monitor / Screen",
    "remote": "Remote Control",
    "keyboard": "Keyboard",
    "mouse": "Mouse",
    "fan": "Fan",
    "ceiling fan": "Ceiling Fan",
    "desk fan": "Desk Fan",
    "bottle": "Bottle",
    "cup": "Cup",
    "chair": "Chair",
    "couch": "Couch / Sofa",
    "bed": "Bed",
    "dining table": "Table",
    "backpack": "Backpack",
    "handbag": "Handbag",
    "suitcase": "Suitcase",
    "book": "Book",
    "clock": "Clock",
    "scissors": "Scissors",
    "bicycle": "Bicycle",
    "car": "Car",
    "motorcycle": "Motorcycle",
    "airplane": "Airplane",
    "bus": "Bus",
    "train": "Train",
    "truck": "Truck",
    "boat": "Boat",
    "fire": "Fire Hazard",
    "smoke": "Smoke Hazard",
    "traffic light": "Traffic Light",
    "fire hydrant": "Fire Hydrant",
}

COCO_CLASS_MAPPINGS: Dict[str, str] = CLASS_NAME_MAPPINGS
COCO_SAR_MAPPINGS = CLASS_NAME_MAPPINGS


def format_class_name(raw_name: str) -> str:
    """Returns human-friendly standardized display name for any detected class."""
    clean = (raw_name or "").lower().strip()
    if clean in CLASS_NAME_MAPPINGS:
        return CLASS_NAME_MAPPINGS[clean]
    # Clean up underscores and capitalize words
    return clean.replace("_", " ").title()


# API ingestion endpoint
API_BASE_URL = os.environ.get("SKYRESQ_API_URL", "http://127.0.0.1:8000")
DETECTIONS_API_ENDPOINT = f"{API_BASE_URL}/api/v1/detection"

