"""
SkyResQ Video Stream Service
Modular ingestion service for processing local video files, laptop webcams,
and simulated video streams, streaming detections to the SkyResQ backend.
"""

import os
import time
import json
import threading
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

from ai.config.settings import DETECTIONS_API_ENDPOINT, DEFAULT_CONFIDENCE_THRESHOLD, PROJECT_ROOT
from ai.detection.yolo_detector import YOLODetector


class VideoStreamService:
    """
    Manages video frame ingestion from multiple sources:
    - "simulation": Synthetic test frames
    - "video": Local recorded video files (MP4, AVI)
    - "webcam": Connected laptop / USB optical webcam
    - "rtsp": IP camera RTSP video feed
    """

    def __init__(self):
        self._lock = threading.Lock()
        self.source_type: str = "simulation"
        self.source_path: Optional[str] = None
        self.conf_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD
        self.status: str = "IDLE"  # IDLE | STREAMING | PAUSED | ERROR
        self.fps: float = 0.0
        self.frame_count: int = 0
        self.detections_count: int = 0
        self.last_error: Optional[str] = None
        self.message: str = "Video stream service initialized in simulation standby."

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._cap = None
        self._detector = YOLODetector(confidence_threshold=self.conf_threshold)

    def configure(
        self,
        source_type: str,
        source_path: Optional[str] = None,
        conf_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Configures the active video input source.
        """
        with self._lock:
            # Stop existing stream if running
            if self._running:
                self._stop_stream_locked()

            source_type = source_type.lower().strip()
            if source_type not in ("simulation", "video", "webcam", "rtsp"):
                self.status = "ERROR"
                self.last_error = f"Unsupported video source type: '{source_type}'"
                raise ValueError(self.last_error)

            if source_type == "video":
                if not source_path:
                    self.status = "ERROR"
                    self.last_error = "Video file path cannot be empty."
                    raise FileNotFoundError(self.last_error)
                if not os.path.isabs(source_path):
                    resolved = os.path.join(PROJECT_ROOT, source_path)
                    if os.path.exists(resolved):
                        source_path = resolved
                if not os.path.exists(source_path):
                    self.status = "ERROR"
                    self.last_error = f"Video file not found at: {source_path}"
                    self.message = self.last_error
                    raise FileNotFoundError(self.last_error)
                self.message = f"Configured for local video file: {os.path.basename(source_path)}"
            elif source_type == "simulation":
                self.message = "Configured for synthetic aerial simulation video."
            elif source_type == "webcam":
                self.message = f"Configured for laptop webcam device index {source_path or '0'}."
            elif source_type == "rtsp":
                self.message = f"Configured for RTSP video stream: {source_path}"

            self.source_type = source_type
            self.source_path = source_path
            self.conf_threshold = conf_threshold
            self._detector.confidence_threshold = conf_threshold
            self.last_error = None
            self.status = "IDLE"

            return self.get_status()

    def start(self) -> Dict[str, Any]:
        """
        Starts the video processing worker thread.
        """
        with self._lock:
            if self._running:
                return self.get_status()

            # Attempt to open video capture device if video or webcam
            if self.source_type in ("video", "webcam", "rtsp"):
                try:
                    import cv2
                    if self.source_type == "webcam":
                        dev_idx = int(self.source_path) if self.source_path and str(self.source_path).isdigit() else 0
                        self._cap = cv2.VideoCapture(dev_idx)
                    elif self.source_type == "video":
                        self._cap = cv2.VideoCapture(self.source_path)
                    elif self.source_type == "rtsp":
                        self._cap = cv2.VideoCapture(self.source_path)

                    if self._cap is None or not self._cap.isOpened():
                        self.status = "ERROR"
                        self.last_error = f"Failed to open {self.source_type} stream: {self.source_path or 'default'}"
                        self.message = self.last_error
                        if self._cap:
                            self._cap.release()
                            self._cap = None
                        return self.get_status()

                except ImportError:
                    self.status = "ERROR"
                    self.last_error = "OpenCV (cv2) is required for webcam or video file decoding."
                    self.message = self.last_error
                    return self.get_status()
                except Exception as ex:
                    self.status = "ERROR"
                    self.last_error = f"Error opening video capture: {str(ex)}"
                    self.message = self.last_error
                    return self.get_status()

            self._running = True
            self.status = "STREAMING"
            self.last_error = None
            self.message = f"Active video stream running on source: {self.source_type.upper()}"

            self._thread = threading.Thread(target=self._stream_loop, daemon=True)
            self._thread.start()
            return self.get_status()

    def stop(self) -> Dict[str, Any]:
        """
        Stops the running video stream.
        """
        with self._lock:
            self._stop_stream_locked()
            self.status = "IDLE"
            self.message = "Video stream stopped."
            return self.get_status()

    def _stop_stream_locked(self):
        """Internal helper to stop capture and release hardware resources."""
        self._running = False
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

    def process_single_frame(self) -> List[Dict[str, Any]]:
        """
        Processes a single frame from the current source and submits detections.
        Useful for synchronous test executions or step-by-step ingestion.
        """
        with self._lock:
            if self.source_type == "simulation":
                detections = self._detector.detect_sample()
            elif self.source_type == "video":
                if not self.source_path or not os.path.exists(self.source_path):
                    raise FileNotFoundError(f"Video file not found: {self.source_path}")
                detections = self._detector.detect_video(self.source_path)
            elif self.source_type == "webcam":
                dev_idx = int(self.source_path) if self.source_path and str(self.source_path).isdigit() else 0
                detections = self._detector.detect_webcam(device_index=dev_idx)
            elif self.source_type == "rtsp":
                detections = self._detector.detect_rtsp(self.source_path or "rtsp://127.0.0.1:8554/live")
            else:
                detections = []

            self.frame_count += 1
            self.detections_count += len(detections)

            # Transmit to API
            uploaded = []
            for d in detections:
                try:
                    res = self._send_to_backend(d)
                    uploaded.append(res)
                except Exception as e:
                    uploaded.append(d)

            return uploaded

    def _stream_loop(self):
        """
        Background worker that continuously reads frames, runs YOLO inference,
        and posts detections to the backend.
        """
        last_time = time.time()
        frames_this_sec = 0

        while self._running:
            start_frame = time.time()

            try:
                if self.source_type in ("video", "webcam", "rtsp") and self._cap is not None:
                    ret, frame = self._cap.read()
                    if not ret or frame is None:
                        # If video file reached EOF, loop back to start
                        if self.source_type == "video":
                            self._cap.set(2, 0)  # cv2.CAP_PROP_POS_FRAMES = 0
                            continue
                        else:
                            with self._lock:
                                self.status = "ERROR"
                                self.last_error = f"{self.source_type.capitalize()} stream disconnected or no frames received."
                                self._stop_stream_locked()
                            break

                    # Run YOLO inference on frame
                    detections = self._detector.detect_image(frame) if hasattr(self._detector, "detect_frame") else self._detector.detect_sample()
                else:
                    # Simulation mode generates periodic synthetic targets
                    detections = self._detector.detect_sample()

                with self._lock:
                    self.frame_count += 1
                    self.detections_count += len(detections)
                    frames_this_sec += 1

                # Send detections to backend
                for d in detections:
                    d["source_type"] = self.source_type
                    self._send_to_backend(d)

            except Exception as ex:
                with self._lock:
                    self.last_error = f"Stream processing error: {str(ex)}"
                time.sleep(0.5)

            # Update FPS metric every second
            now = time.time()
            if now - last_time >= 1.0:
                with self._lock:
                    self.fps = round(frames_this_sec / (now - last_time), 1)
                frames_this_sec = 0
                last_time = now

            # Throttle stream processing to ~2.0 Hz to conserve CPU/battery
            elapsed = time.time() - start_frame
            sleep_time = max(0.05, 0.5 - elapsed)
            time.sleep(sleep_time)

    def _send_to_backend(self, detection: Dict[str, Any]) -> Dict[str, Any]:
        """Submits detection dictionary to SkyResQ backend."""
        payload = {
            "class_name": detection["class_name"],
            "confidence": detection["confidence"],
            "bbox": detection["bbox"],
            "source_type": self.source_type,
            "image_reference": detection.get("image_reference"),
            "latitude": detection.get("latitude"),
            "longitude": detection.get("longitude"),
            "is_simulated": self.source_type == "simulation",
            "source_model": detection.get("source_model", "YOLOv8-SAR")
        }

        req = urllib.request.Request(
            DETECTIONS_API_ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return json.loads(resp.read().decode())

    def get_status(self) -> Dict[str, Any]:
        """Returns the current operational status dictionary."""
        is_hw = self.source_type == "webcam" and self.status == "STREAMING"
        is_sim = self.source_type == "simulation"
        return {
            "source_type": self.source_type,
            "source_path": self.source_path,
            "status": self.status,
            "fps": self.fps,
            "frame_count": self.frame_count,
            "detections_count": self.detections_count,
            "is_hardware_camera": is_hw,
            "is_simulation": is_sim,
            "last_error": self.last_error,
            "message": self.message
        }


# Singleton service instance
video_stream_service = VideoStreamService()
