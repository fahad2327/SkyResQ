# SkyResQ AI & YOLO Detection Integration Manual

This document provides instructions for using and extending the **SkyResQ YOLO AI Detection Subsystem**.

---

## 1. Subsystem Overview

The `ai/` package provides a standalone, modular computer vision pipeline capable of detecting victims, vehicles, and environmental hazards across multiple video/image sources.

### Key Features:
* **Multi-Input Support**: Static images, recorded videos, live USB webcams, and IP camera RTSP streams.
* **Dual-Mode Inference**:
  * **Real Inference**: Leverages `ultralytics` YOLOv8 when installed and model weights are provided.
  * **Simulation Mode**: Operates out-of-the-box without large AI downloads, providing safe, deterministic SAR test data.
* **Class Mapping**: Automatically categorizes detected objects into SAR mission categories: `person`, `vehicle`, `fire`, `hazard`, and `other`.
* **Safe Georeferencing**: Preserves integrity by not inventing false GPS coordinates for targets detected purely in image space.

---

## 2. Quickstart: Running Detections

### Mode A: Safe Simulation Test (Zero Dependencies)
Run a verified synthetic detection test that sends targets to the dashboard:
```powershell
& "backend\.venv\Scripts\python.exe" -m ai.detection.pipeline --mode sample
```

### Mode B: Static Image Detection
Detect victims/objects in an aerial photograph:
```powershell
& "backend\.venv\Scripts\python.exe" -m ai.detection.pipeline --mode image --path "path/to/sar_photo.jpg"
```

### Mode C: Recorded Video File
Analyze a drone flight recording:
```powershell
& "backend\.venv\Scripts\python.exe" -m ai.detection.pipeline --mode video --path "path/to/mission_flight.mp4"
```

### Mode D: Live USB Webcam
Stream detections from a connected optical camera:
```powershell
& "backend\.venv\Scripts\python.exe" -m ai.detection.pipeline --mode webcam --device 0
```

### Mode E: Future RTSP Drone Video Stream
Connect to a real drone's onboard video transmitter:
```powershell
& "backend\.venv\Scripts\python.exe" -m ai.detection.pipeline --mode rtsp --url "rtsp://192.168.1.100:8554/live"
```

---

## 3. Connecting Ultralytics YOLOv8

When ready to use real deep-learning weights:

1. **Install Ultralytics**:
   ```powershell
   & "backend\.venv\Scripts\pip.exe" install ultralytics
   ```

2. **Download or Place Model Weights**:
   Place your trained or pre-trained weights in `ai/models/` (e.g. `ai/models/yolov8n.pt` or `ai/models/yolov8_sar.pt`).

3. **Inference Example in Custom Script**:
   ```python
   from ai.detection.yolo_detector import YOLODetector
   from ai.detection.pipeline import send_detection_to_backend

   detector = YOLODetector(model_path="ai/models/yolov8n.pt", confidence_threshold=0.55)
   detections = detector.detect_image("test_frame.jpg")

   for det in detections:
       send_detection_to_backend(det)
   ```

---

## 4. Video & Camera Ingestion Service

SkyResQ includes a dedicated Video Stream Service (`ai/video/video_stream_service.py`) and API router (`backend/app/api/video.py`) allowing dynamic switching between input feeds:

* **Simulation Standby (`simulation`)**: Pure synthetic aerial video stream for development and hardware-free demonstrations.
* **Local Video File (`video`)**: Decodes MP4/AVI flight recordings frame-by-frame via OpenCV (`cv2.VideoCapture`).
* **Laptop / USB Webcam (`webcam`)**: Captures real-time optical video from connected camera hardware.
* **RTSP Stream (`rtsp`)**: Interfaces with future IP camera transmitters and RTSP video servers.

### Video API Endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/video/status` | Ingestion status, active source, stream FPS, frame counts |
| `POST` | `/api/v1/video/source` | Switch source (`{"source_type": "video", "source_path": "..."}`) |
| `POST` | `/api/v1/video/start` | Start background video streaming worker thread |
| `POST` | `/api/v1/video/stop` | Stop video streaming worker thread |
| `POST` | `/api/v1/video/process-frame` | Synchronously extract and process a single frame |

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/detections` | Ingests a new detection event from YOLO |
| `GET` | `/api/v1/detections` | Returns list of recent detections (supports `?limit=20&class_name=person`) |
| `GET` | `/api/v1/detections/latest` | Returns the single most recent detection snapshot |
| `GET` | `/api/v1/detections/summary` | Aggregated counts for mission dashboard cards |
| `DELETE` | `/api/v1/detections` | Clears all recorded detections from memory |
| `GET` | `/api/v1/video/status` | Returns stream telemetry and active video source configuration |
| `POST` | `/api/v1/video/source` | Switches video source (simulation, video, webcam, rtsp) |
| `POST` | `/api/v1/video/start` | Starts live streaming thread |
| `POST` | `/api/v1/video/stop` | Stops live streaming thread |
| `POST` | `/api/v1/video/process-frame` | Synchronously processes a single video frame |

### Example Detection JSON Payload:
```json
{
  "class_name": "person",
  "confidence": 0.945,
  "bbox": {
    "x1": 315.0,
    "y1": 185.0,
    "x2": 435.0,
    "y2": 400.0
  },
  "source_type": "video",
  "image_reference": "sample_video.mp4",
  "latitude": 34.2531,
  "longitude": -118.1512,
  "is_simulated": false,
  "source_model": "YOLOv8-SAR"
}
```

---

## 6. Current Limitations & Next Steps

1. **Camera Gimbal Georeferencing**: In the absence of a calibrated gimbal orientation sensor and digital elevation model (DEM), targets detected on camera are flagged with drone coordinates or labeled `GPS Unavailable`. Real physical drone camera georeferencing is not claimed.
2. **Thermal Hotspot Segmentation**: Wildfire / hotspot detection will benefit from fine-tuning on aerial thermal FLIR datasets in a future milestone.
3. **Physical Drone Hardware**: Real drone hardware communication and real drone camera streaming are not connected; the dashboard operates with simulated telemetry and modular video input.
