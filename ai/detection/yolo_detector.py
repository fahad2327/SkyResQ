"""
SkyResQ YOLO Object Detector
Modular detection engine supporting images, videos, webcams, RTSP streams,
and safe synthetic simulation fallback.
"""

import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union

from ai.config.settings import (
    DEFAULT_CONFIDENCE_THRESHOLD,
    DEFAULT_IOU_THRESHOLD,
    COCO_CLASS_MAPPINGS,
    CATEGORY_OTHER,
    SUPPORTED_SOURCES,
    SAR_TARGET_CLASS_IDS,
    format_class_name
)


class YOLODetector:
    """
    Modular YOLO-based victim and hazard detector for SkyResQ.
    Supports:
      - Static images (JPEG, PNG)
      - Recorded video files (MP4, AVI)
      - Live USB Webcams (cv2 device index)
      - Future RTSP IP camera streams
      - Safe synthetic test simulation mode
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        iou_threshold: float = DEFAULT_IOU_THRESHOLD,
        force_simulation: bool = False
    ):
        self.model_path = model_path
        self.confidence_threshold = max(0.0, min(1.0, float(confidence_threshold)))
        self.iou_threshold = max(0.0, min(1.0, float(iou_threshold)))
        self.force_simulation = force_simulation
        self._counter = 0

        # Attempt to load Ultralytics YOLO if available and weights exist
        self.model = None
        self.is_real_model_loaded = False

        if not self.force_simulation and self.model_path and os.path.exists(self.model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                self.is_real_model_loaded = True
            except ImportError:
                # Package ultralytics not installed
                self.is_real_model_loaded = False
            except Exception as err:
                self.is_real_model_loaded = False

    def _now_utc(self) -> str:
        """Returns current timestamp in ISO 8601 UTC format."""
        return datetime.now(timezone.utc).isoformat()

    def _generate_id(self, is_simulated: bool) -> str:
        """Generates a sequential detection identifier."""
        self._counter += 1
        prefix = "DET-SIM" if is_simulated else "DET-LIVE"
        return f"{prefix}-{self._counter:03d}"

    def map_class_name(self, raw_name: str) -> str:
        """Maps COCO or detector class names to standardized friendly names."""
        return format_class_name(raw_name)

    def detect_image(
        self,
        image_path: str,
        drone_latitude: Optional[float] = None,
        drone_longitude: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes detection on a local image file.
        :raises FileNotFoundError: If the image file does not exist.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Target image not found at: {image_path}")

        if self.is_real_model_loaded and self.model is not None:
            return self._run_yolo_inference(
                source=image_path,
                source_type="image",
                drone_latitude=drone_latitude,
                drone_longitude=drone_longitude,
                is_simulated=False
            )
        else:
            return self._run_synthetic_detection(
                source_type="image",
                image_ref=os.path.basename(image_path),
                drone_latitude=drone_latitude,
                drone_longitude=drone_longitude
            )

    def detect_video(
        self,
        video_path: str,
        max_frames: int = 10,
        drone_latitude: Optional[float] = None,
        drone_longitude: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes detection on a recorded video file.
        :raises FileNotFoundError: If the video file does not exist.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Target video not found at: {video_path}")

        if self.is_real_model_loaded and self.model is not None:
            return self._run_yolo_inference(
                source=video_path,
                source_type="video",
                drone_latitude=drone_latitude,
                drone_longitude=drone_longitude,
                is_simulated=False
            )
        else:
            return self._run_synthetic_detection(
                source_type="video",
                image_ref=os.path.basename(video_path),
                drone_latitude=drone_latitude,
                drone_longitude=drone_longitude
            )

    def detect_webcam(
        self,
        device_index: int = 0,
        drone_latitude: Optional[float] = None,
        drone_longitude: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes detection on a connected USB/optical webcam device.
        :raises RuntimeError: If webcam capture device cannot be opened.
        """
        try:
            import cv2
            cap = cv2.VideoCapture(device_index)
            if not cap.isOpened():
                raise RuntimeError(f"Webcam device index {device_index} is unavailable or in use.")
            ret, frame = cap.read()
            cap.release()
            if not ret or frame is None:
                raise RuntimeError(f"Failed to capture frame from webcam device {device_index}.")

            if self.is_real_model_loaded and self.model is not None:
                return self._run_yolo_inference(
                    source=frame,
                    source_type="webcam",
                    drone_latitude=drone_latitude,
                    drone_longitude=drone_longitude,
                    is_simulated=False
                )
        except ImportError:
            pass

        # If OpenCV or webcam is not available, safely return synthetic data or error
        return self._run_synthetic_detection(
            source_type="webcam",
            image_ref=f"webcam_device_{device_index}.jpg",
            drone_latitude=drone_latitude,
            drone_longitude=drone_longitude
        )

    def detect_rtsp(
        self,
        rtsp_url: str,
        drone_latitude: Optional[float] = None,
        drone_longitude: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Connects to a future RTSP video stream (e.g. rtsp://192.168.1.100:8554/drone_cam).
        :raises ValueError: If RTSP URL is malformed.
        """
        if not rtsp_url.startswith(("rtsp://", "rtsps://", "http://", "https://")):
            raise ValueError(f"Invalid RTSP URL format: {rtsp_url}")

        if self.is_real_model_loaded and self.model is not None:
            return self._run_yolo_inference(
                source=rtsp_url,
                source_type="rtsp",
                drone_latitude=drone_latitude,
                drone_longitude=drone_longitude,
                is_simulated=False
            )
        else:
            return self._run_synthetic_detection(
                source_type="rtsp",
                image_ref=f"rtsp_stream_{rtsp_url.split('/')[-1] or 'feed'}.jpg",
                drone_latitude=drone_latitude,
                drone_longitude=drone_longitude
            )

    def detect_sample(
        self,
        drone_latitude: Optional[float] = None,
        drone_longitude: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes a safe standalone sample detection without requiring any media files or hardware.
        """
        return self._run_synthetic_detection(
            source_type="simulation",
            image_ref="sample_sar_sector7b.jpg",
            drone_latitude=drone_latitude,
            drone_longitude=drone_longitude
        )

    def _run_yolo_inference(
        self,
        source: Any,
        source_type: str,
        drone_latitude: Optional[float],
        drone_longitude: Optional[float],
        is_simulated: bool
    ) -> List[Dict[str, Any]]:
        """Runs inference with the loaded Ultralytics model."""
        predict_kwargs = {
            "source": source,
            "conf": self.confidence_threshold,
            "iou": self.iou_threshold,
            "verbose": False
        }
        if SAR_TARGET_CLASS_IDS:
            predict_kwargs["classes"] = SAR_TARGET_CLASS_IDS

        results = self.model(**predict_kwargs)

        detections = []
        now = self._now_utc()

        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue

            for box in boxes:
                conf = float(box.conf[0])
                if conf < self.confidence_threshold:
                    continue

                cls_id = int(box.cls[0])
                raw_name = r.names.get(cls_id, "unknown")
                class_name = self.map_class_name(raw_name)

                coords = box.xyxy[0].tolist()
                bbox = {
                    "x1": round(float(coords[0]), 2),
                    "y1": round(float(coords[1]), 2),
                    "x2": round(float(coords[2]), 2),
                    "y2": round(float(coords[3]), 2)
                }

                # Rule 11: Do not assign accurate victim GPS without camera gimbal georeferencing
                det = {
                    "detection_id": self._generate_id(is_simulated),
                    "class_name": class_name,
                    "confidence": round(conf, 4),
                    "bbox": bbox,
                    "source_type": source_type,
                    "timestamp": now,
                    "latitude": drone_latitude,  # Explicitly labeled as drone sensor coordinates if provided
                    "longitude": drone_longitude,
                    "image_reference": f"{source_type}_frame_{int(time.time())}.jpg",
                    "is_simulated": is_simulated,
                    "status": "CONFIRMED" if conf >= 0.70 else "INVESTIGATING",
                    "source_model": self.model_path or "YOLOv8-Live"
                }
                detections.append(det)

        return detections

    def _run_synthetic_detection(
        self,
        source_type: str,
        image_ref: str,
        drone_latitude: Optional[float] = None,
        drone_longitude: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Produces realistic, clearly flagged synthetic detections for Sector 7B SAR testing.
        Guarantees that simulation mode is active and verified without risking false claims.
        """
        now = self._now_utc()
        return [
            {
                "detection_id": self._generate_id(is_simulated=True),
                "class_name": "person",
                "confidence": 0.945,
                "bbox": {"x1": 315.0, "y1": 185.0, "x2": 435.0, "y2": 400.0},
                "source_type": source_type,
                "timestamp": now,
                "latitude": drone_latitude if drone_latitude is not None else 34.2531,
                "longitude": drone_longitude if drone_longitude is not None else -118.1512,
                "image_reference": image_ref,
                "is_simulated": True,
                "status": "CONFIRMED",
                "source_model": "YOLOv8-SAR-Simulation"
            },
            {
                "detection_id": self._generate_id(is_simulated=True),
                "class_name": "vehicle",
                "confidence": 0.862,
                "bbox": {"x1": 120.0, "y1": 240.0, "x2": 280.0, "y2": 370.0},
                "source_type": source_type,
                "timestamp": now,
                "latitude": drone_latitude if drone_latitude is not None else 34.2545,
                "longitude": drone_longitude if drone_longitude is not None else -118.1538,
                "image_reference": image_ref,
                "is_simulated": True,
                "status": "CONFIRMED",
                "source_model": "YOLOv8-SAR-Simulation"
            }
        ]
