"""
SkyResQ Detection Service
Modular service handling image persistence, AI inference execution via ai.yolo_service,
detection history archiving, and dynamic summary metrics calculation.
"""

import math
import time
import os
import sys
import uuid
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

# Ensure workspace root is in sys.path so ai package can be imported from backend context
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.yolo_service import yolo_service
from ai.config import ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE_BYTES, PERSON_CLASS_NAMES, HAZARD_CLASS_NAMES
from app.schemas.detection import (
    BoundingBox,
    DetectionItem,
    ImageDetectionResponse,
    DetectionHealthResponse,
    DetectionHistoryItem,
    DetectionSummaryResponse
)
from app.services.telemetry_service import telemetry_service
from app.db import (
    save_detection,
    get_recent_detections,
    get_detection_counts,
    delete_detection_by_image_id,
    clear_detections_table
)

# Media directories setup
MEDIA_ROOT = Path(os.environ.get("SKYRESQ_MEDIA_DIR", str(PROJECT_ROOT / "media")))
UPLOADS_DIR = MEDIA_ROOT / "uploads"
DETECTIONS_DIR = MEDIA_ROOT / "detections"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DETECTIONS_DIR.mkdir(parents=True, exist_ok=True)


def compute_angle_profile(det_item, heading_val: Optional[float] = None) -> Dict[str, Any]:
    """
    Computes an angle and pose profile from a detection bounding box aspect ratio
    and drone/sensor heading angle to deduplicate continuous streams while detecting
    viewpoint shifts.
    """
    b = det_item.bbox
    w = max(1.0, float(b.x2 - b.x1))
    h = max(1.0, float(b.y2 - b.y1))
    aspect = round(w / h, 2)
    if aspect < 0.32:
        pose_view = "Side Profile"
    elif aspect <= 0.48:
        pose_view = "Frontal / Rear"
    elif aspect <= 0.85:
        pose_view = "Quarter Angled (45°)"
    else:
        pose_view = "Reclined / Prone / Seated"

    heading_sector = None
    if heading_val is not None:
        heading_sector = int(round((heading_val % 360) / 30.0) * 30)

    return {
        "aspect": aspect,
        "pose_view": pose_view,
        "heading_sector": heading_sector,
        "label": f"{pose_view}" + (f" ({heading_sector}°)" if heading_sector is not None else "")
    }


class DetectionService:
    """
    Thread-safe detection management service.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._history: List[DetectionHistoryItem] = []
        self._max_history = 50
        
        # Hydrate counters and history from persistent database
        try:
            db_stats = get_detection_counts()
        except Exception as e:
            logger.warning(f"[SkyResQ Detection] Initial DB stats hydration deferred: {e}")
            db_stats = {
                "total_persons": 0,
                "total_hazards": 0,
                "total_detections": 0,
                "last_detection_time": None
            }
        self._total_persons = db_stats.get("total_persons", 0)
        self._total_hazards = db_stats.get("total_hazards", 0)
        self._total_detections = db_stats.get("total_detections", 0)
        self._last_detection_time: Optional[str] = db_stats.get("last_detection_time")
        self._data_mode = "LIVE_YOLO" if yolo_service.is_model_present() else "STANDBY"
        self._tracked_targets: Dict[str, Dict[str, Any]] = {}

        try:
            recent_db = get_recent_detections(limit=50)
            seen_images = set()
            for d in recent_db:
                img_id = d.get("image_id") or d.get("detection_id")
                if img_id and img_id not in seen_images:
                    seen_images.add(img_id)
                    self._history.append(DetectionHistoryItem(
                        image_id=img_id,
                        filename=f"{img_id}.jpg",
                        original_filename=f"{img_id}.jpg",
                        timestamp=d.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                        mode="SQLITE_PERSISTED",
                        data_mode="SQLITE_PERSISTED",
                        total_detections=1,
                        person_count=1 if (d.get("class_name") or "").lower() in PERSON_CLASS_NAMES else 0,
                        hazard_count=1 if (d.get("class_name") or "").lower() in HAZARD_CLASS_NAMES else 0,
                        annotated_image_url=d.get("annotated_image_url") or d.get("image_url"),
                        latitude=d.get("latitude"),
                        longitude=d.get("longitude"),
                        is_real_gps=bool(d.get("is_real_gps")),
                        model_used=d.get("model_used") or "YOLOv8",
                        conf_threshold=d.get("confidence") or 0.25,
                        source_type=d.get("source_type") or "drone_rgb",
                        notes=d.get("notes") or d.get("class_name")
                    ))
        except Exception:
            pass

    def clear(self) -> None:
        """Resets all detection counters, deletes captured images, and clears detection history from memory and database."""
        with self._lock:
            for item in self._history:
                img_id = getattr(item, "image_id", None)
                if img_id:
                    for p in DETECTIONS_DIR.glob(f"{img_id}_*"):
                        try:
                            p.unlink(missing_ok=True)
                        except Exception:
                            pass
                    for p in UPLOADS_DIR.glob(f"{img_id}_*"):
                        try:
                            p.unlink(missing_ok=True)
                        except Exception:
                            pass

            self._history.clear()
            self._total_persons = 0
            self._total_hazards = 0
            self._total_detections = 0
            self._last_detection_time = None
            self._tracked_targets.clear()
            # Sync with SQLite database
            clear_detections_table()

    def delete_history_item(self, image_id: str) -> bool:
        """
        Deletes a specific detection run from history and removes associated
        annotated and uploaded images from disk and database.
        """
        with self._lock:
            target_idx = None
            target_item = None
            for idx, item in enumerate(self._history):
                if getattr(item, "image_id", None) == image_id:
                    target_idx = idx
                    target_item = item
                    break

            # Sync with database regardless of memory buffer state
            deleted_from_db = delete_detection_by_image_id(image_id)

            if target_item is None and not deleted_from_db:
                return False

            # Delete physical files from disk
            for p in DETECTIONS_DIR.glob(f"{image_id}_*"):
                try:
                    p.unlink(missing_ok=True)
                except Exception:
                    pass
            for p in UPLOADS_DIR.glob(f"{image_id}_*"):
                try:
                    p.unlink(missing_ok=True)
                except Exception:
                    pass

            if target_idx is not None:
                self._history.pop(target_idx)

            return True

            try:
                for p in DETECTIONS_DIR.glob(f"{image_id}_*"):
                    try:
                        p.unlink(missing_ok=True)
                    except Exception:
                        pass
                for p in UPLOADS_DIR.glob(f"{image_id}_*"):
                    try:
                        p.unlink(missing_ok=True)
                    except Exception:
                        pass
            except Exception:
                pass

            # Update metrics
            p_cnt = getattr(target_item, "person_detections", 0) or 0
            h_cnt = getattr(target_item, "hazard_detections", 0) or 0
            tot = getattr(target_item, "total_detections", 0) or 0

            self._total_persons = max(0, self._total_persons - p_cnt)
            self._total_hazards = max(0, self._total_hazards - h_cnt)
            self._total_detections = max(0, self._total_detections - tot)

            self._history.pop(target_idx)
            return True

    def get_health(self) -> DetectionHealthResponse:
        """Retrieves diagnostic and model readiness state from YOLO service."""
        health = yolo_service.get_health_status()
        return DetectionHealthResponse(
            status=health.status,
            service=health.service,
            package_available=health.package_available,
            model_exists=health.model_exists,
            model_loaded=health.model_loaded,
            model_name=health.model_name,
            detection_mode=health.detection_mode
        )

    def process_image(
        self,
        file_bytes: bytes,
        original_filename: str,
        conf_threshold: float = 0.25,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        source_type: Optional[str] = None
    ) -> ImageDetectionResponse:
        """
        Validates, persists, runs YOLO inference, annotates, georeferences, and records an image submission.
        """
        # Resolve source type
        if source_type is None:
            fn_lower = original_filename.lower()
            if "webcam" in fn_lower:
                source_type = "laptop_webcam"
            elif "mobile" in fn_lower:
                source_type = "mobile_camera"
            else:
                source_type = "simulation"

        # Validate file extension
        ext = Path(original_filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValueError(
                f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
            )

        # Validate file size
        if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(
                f"File size exceeds maximum allowable limit of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)} MB"
            )

        # Georeference resolution
        is_real_gps = False
        if latitude is None or longitude is None:
            drone_telemetry = telemetry_service.get_drone_status()
            target_lat = drone_telemetry.latitude
            target_lon = drone_telemetry.longitude
            is_real_gps = drone_telemetry.is_real_gps
            heading = getattr(drone_telemetry, "heading_degrees", None)
        else:
            target_lat = round(latitude, 6)
            target_lon = round(longitude, 6)
            is_real_gps = True
            telemetry_snap = telemetry_service.get_drone_status()
            heading = getattr(telemetry_snap, "heading_degrees", None)

        # Generate unique identifier and paths
        image_id = str(uuid.uuid4())[:8]
        safe_basename = "".join(c for c in Path(original_filename).stem if c.isalnum() or c in ("-", "_"))[:30]
        upload_filename = f"{image_id}_{safe_basename}{ext}"
        annotated_filename = f"{image_id}_{safe_basename}_annotated.jpg"

        upload_path = UPLOADS_DIR / upload_filename
        annotated_path = DETECTIONS_DIR / annotated_filename

        # Write uploaded file to disk
        with open(upload_path, "wb") as f:
            f.write(file_bytes)

        # Execute YOLO inference through decoupled AI service
        inference_result = yolo_service.predict_image(
            image_path=upload_path,
            conf_threshold=conf_threshold,
            annotate=True,
            output_annotated_path=annotated_path,
            image_url_prefix="/media/detections"
        )

        # Tally persons and hazards
        person_count = 0
        hazard_count = 0
        for det in inference_result.detections:
            cls = det.class_name.lower().strip()
            if cls in PERSON_CLASS_NAMES:
                person_count += 1
            elif cls in HAZARD_CLASS_NAMES:
                hazard_count += 1

        is_webcam = "webcam" in original_filename.lower() or source_type == "laptop_webcam"
        is_continuous = (
            is_webcam
            or source_type in ("laptop_webcam", "mobile_camera", "phone", "drone_stream")
            or "mobile" in original_filename.lower()
            or "webcam" in original_filename.lower()
        )
        now_ts = time.time()

        should_record_run = not is_continuous or (hazard_count > 0)
        new_or_new_angle_detections = []

        # Thread-safe history and summary update
        with self._lock:
            self._data_mode = inference_result.mode
            if inference_result.total_detections > 0:
                self._last_detection_time = inference_result.timestamp

            if is_continuous:
                # Prune targets older than 12.0 seconds
                self._tracked_targets = {
                    tid: t for tid, t in self._tracked_targets.items()
                    if now_ts - t.get("last_seen", 0) < 12.0
                }

                new_persons_count = 0
                new_objects_count = 0
                for idx, det in enumerate(inference_result.detections):
                    cls_lower = det.class_name.lower().strip()
                    is_person = cls_lower in PERSON_CLASS_NAMES
                    is_hazard = cls_lower in HAZARD_CLASS_NAMES

                    # Centroid coordinates
                    b = det.bbox
                    cx = (b.x1 + b.x2) / 2.0
                    cy = (b.y1 + b.y2) / 2.0
                    angle_info = compute_angle_profile(det, heading)

                    # Match against active tracked targets of same class
                    matched_id = None
                    for tid, t in self._tracked_targets.items():
                        if t.get("class_name") == det.class_name:
                            dist = math.hypot(cx - t.get("cx", 0), cy - t.get("cy", 0))
                            if dist < 120.0:  # Within 120 pixels
                                matched_id = tid
                                break

                    if not matched_id:
                        # New unique person or object identified
                        tid = f"target_{len(self._tracked_targets) + 1}_{int(now_ts)}"
                        self._tracked_targets[tid] = {
                            "class_name": det.class_name,
                            "cx": cx,
                            "cy": cy,
                            "last_seen": now_ts,
                            "last_captured_ts": now_ts,
                            "captured_angles": [angle_info]
                        }
                        if is_person:
                            new_persons_count += 1
                            note_text = f"Person First Sighted [{angle_info['label']}]"
                        elif is_hazard:
                            note_text = f"Hazard Detected [{det.class_name}]"
                        else:
                            new_objects_count += 1
                            note_text = f"{det.class_name} Sighted"

                        should_record_run = True
                        new_or_new_angle_detections.append((idx, det, note_text))
                    else:
                        # Existing target: check if captured from a NEW distinct angle
                        t = self._tracked_targets[matched_id]
                        t["cx"] = cx
                        t["cy"] = cy
                        t["last_seen"] = now_ts

                        if is_person:
                            captured_list = t.get("captured_angles", [])
                            is_distinct_angle = False

                            for prev_a in captured_list:
                                prev_aspect = prev_a.get("aspect", 0.4)
                                prev_view = prev_a.get("pose_view")
                                prev_head = prev_a.get("heading_sector")

                                curr_aspect = angle_info["aspect"]
                                curr_view = angle_info["pose_view"]
                                curr_head = angle_info["heading_sector"]

                                aspect_change = abs(curr_aspect - prev_aspect) / max(0.1, prev_aspect)
                                view_changed = (curr_view != prev_view)
                                head_changed = (curr_head is not None and prev_head is not None and abs(curr_head - prev_head) >= 30)

                                if aspect_change >= 0.25 or view_changed or head_changed:
                                    is_distinct_angle = True
                                else:
                                    is_distinct_angle = False
                                    break

                            time_since_last = now_ts - t.get("last_captured_ts", 0)
                            if is_distinct_angle and time_since_last >= 3.0:
                                t["captured_angles"].append(angle_info)
                                t["last_captured_ts"] = now_ts
                                should_record_run = True
                                new_or_new_angle_detections.append((idx, det, f"Person New Angle [{angle_info['label']}]"))

                self._total_persons += new_persons_count
                self._total_hazards += hazard_count
                self._total_detections += (new_persons_count + hazard_count + new_objects_count)

            else:
                should_record_run = True
                self._total_detections += inference_result.total_detections
                self._total_persons += person_count
                self._total_hazards += hazard_count
                for idx, det in enumerate(inference_result.detections):
                    angle_info = compute_angle_profile(det, heading)
                    new_or_new_angle_detections.append((idx, det, f"Detected [{angle_info['label']}]"))

            # Persist individual detections and history only when a new person, new angle, or hazard is present
            if should_record_run and new_or_new_angle_detections:
                for idx, det, note in new_or_new_angle_detections:
                    cls_lower = det.class_name.lower().strip()
                    v_status = "CRITICAL" if cls_lower in PERSON_CLASS_NAMES else ("HAZARD" if cls_lower in HAZARD_CLASS_NAMES else "STABLE")
                    save_detection({
                        "detection_id": f"DET-{image_id}-{idx + 1}",
                        "image_id": image_id,
                        "timestamp": inference_result.timestamp,
                        "class_name": det.class_name,
                        "confidence": det.confidence,
                        "bbox_x1": det.bbox.x1,
                        "bbox_y1": det.bbox.y1,
                        "bbox_x2": det.bbox.x2,
                        "bbox_y2": det.bbox.y2,
                        "image_url": f"/media/uploads/{upload_filename}",
                        "annotated_image_url": inference_result.annotated_image_url,
                        "latitude": target_lat,
                        "longitude": target_lon,
                        "is_real_gps": is_real_gps,
                        "source_type": source_type,
                        "model_used": inference_result.model_name,
                        "victim_status": v_status,
                        "notes": f"{note} via {source_type}"
                    })

                history_item = DetectionHistoryItem(
                    image_id=image_id,
                    filename=original_filename,
                    original_filename=original_filename,
                    timestamp=inference_result.timestamp,
                    mode=inference_result.mode,
                    data_mode=inference_result.mode,
                    total_detections=len(new_or_new_angle_detections),
                    person_count=sum(1 for _, d, _ in new_or_new_angle_detections if d.class_name.lower() in PERSON_CLASS_NAMES),
                    person_detections=sum(1 for _, d, _ in new_or_new_angle_detections if d.class_name.lower() in PERSON_CLASS_NAMES),
                    hazard_count=sum(1 for _, d, _ in new_or_new_angle_detections if d.class_name.lower() in HAZARD_CLASS_NAMES),
                    hazard_detections=sum(1 for _, d, _ in new_or_new_angle_detections if d.class_name.lower() in HAZARD_CLASS_NAMES),
                    annotated_image_url=inference_result.annotated_image_url,
                    latitude=target_lat,
                    longitude=target_lon,
                    is_real_gps=is_real_gps,
                    model_used=inference_result.model_name,
                    conf_threshold=conf_threshold,
                    source_type=source_type,
                    notes=new_or_new_angle_detections[0][2] if new_or_new_angle_detections else f"Captured via {source_type}"
                )
                self._history.insert(0, history_item)

                if len(self._history) > self._max_history:
                    self._history.pop()


        return ImageDetectionResponse(
            success=inference_result.success,
            mode=inference_result.mode,
            data_mode=inference_result.mode,
            source="uploaded_image",
            image_id=image_id,
            timestamp=inference_result.timestamp,
            model_name=inference_result.model_name,
            model_used=inference_result.model_name,
            confidence_threshold=conf_threshold,
            conf_threshold=conf_threshold,
            detections=[
                DetectionItem(
                    class_id=d.class_id,
                    class_name=d.class_name,
                    confidence=d.confidence,
                    bbox=BoundingBox(
                        x1=d.bbox.x1,
                        y1=d.bbox.y1,
                        x2=d.bbox.x2,
                        y2=d.bbox.y2,
                        width=round(abs(d.bbox.x2 - d.bbox.x1), 2),
                        height=round(abs(d.bbox.y2 - d.bbox.y1), 2)
                    )
                )
                for d in inference_result.detections
            ],
            total_detections=inference_result.total_detections,
            person_detections=person_count,
            hazard_detections=hazard_count,
            annotated_image_url=inference_result.annotated_image_url,
            latitude=target_lat,
            longitude=target_lon,
            is_real_gps=is_real_gps,
            error=inference_result.error
        )

    def get_history(self, limit: int = 20) -> List[DetectionHistoryItem]:
        """Returns the most recent detection run records."""
        with self._lock:
            return list(self._history[:max(1, min(limit, self._max_history))])

    def get_summary(self) -> DetectionSummaryResponse:
        """Returns live aggregate detection metrics."""
        with self._lock:
            return DetectionSummaryResponse(
                data_mode=self._data_mode.lower(),
                victims_detected=self._total_persons,
                hazards_detected=self._total_hazards,
                last_detection_time=self._last_detection_time,
                total_detections=self._total_detections
            )


# Global singleton instance for application use
detection_service = DetectionService()
