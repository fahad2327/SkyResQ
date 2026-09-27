# SkyResQ Independent: End-to-End YOLO Integration Guide

This guide documents the complete integration pipeline of **SkyResQ Independent**, connecting:

$$\text{YOLO Detection Module} \longrightarrow \text{FastAPI Backend} \longrightarrow \text{Frontend Dashboard}$$

---

## 1. Pipeline Overview

```
┌────────────────────────────────────────────────────────┐
│               Frontend Dashboard (Port 3000)           │
│  - Drag-and-drop ingestion dropzone                    │
│  - Interactive confidence threshold slider (5% - 95%)  │
│  - Quick-load Sample SAR Image button                  │
│  - Annotated visual viewport with tactical HUD reticle │
│  - Structured breakdown table & detection history list │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/v1/detection/image (multipart/form-data)
                            ▼
┌────────────────────────────────────────────────────────┐
│               FastAPI Backend (Port 8000)              │
│  - Image validation (.jpg, .png, .webp, max 15MB)      │
│  - Mounted static media at /media                      │
│  - In-memory thread-safe detection history & summary   │
│  - Endpoints: /image, /health, /history, /summary      │
└───────────────────────────┬────────────────────────────┘
                            │ Method call: yolo_service.predict_image(...)
                            ▼
┌────────────────────────────────────────────────────────┐
│           AI YOLO Module (ai/yolo_service.py)          │
│  - Ultralytics YOLOv8 engine (weights: yolov8n.pt)     │
│  - Bounding box extraction and SAR class remapping     │
│  - Automated visual annotation (OpenCV / plot())       │
│  - Graceful fallback to deterministic SIMULATION mode  │
└────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints Specification

### 2.1 `POST /api/v1/detection/image`
Analyzes an uploaded image, executes YOLO inference, saves annotated visual, and returns structured targets.

* **Content-Type**: `multipart/form-data`
* **Parameters**:
  * `file` (*UploadFile*, required): Image file (`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`). Max 15 MB.
  * `conf_threshold` (*float*, optional, default `0.25`): Confidence cutoff threshold between `0.05` and `1.0`.
* **Validation**: Non-image formats return `HTTP 400 Bad Request`.

#### Sample Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "mode": "TEST_IMAGE",
  "data_mode": "TEST_IMAGE",
  "source": "uploaded_image",
  "image_id": "fbe69e1e",
  "timestamp": "2026-09-21T19:00:43.766795+00:00",
  "model_name": "yolov8n.pt",
  "model_used": "yolov8n.pt",
  "confidence_threshold": 0.25,
  "conf_threshold": 0.25,
  "detections": [
    {
      "class_id": 0,
      "class_name": "person",
      "confidence": 0.5886,
      "bbox": {
        "x1": 810.34,
        "y1": 418.62,
        "x2": 850.73,
        "y2": 497.7,
        "width": 40.39,
        "height": 79.08
      },
      "box": {
        "x1": 810.34,
        "y1": 418.62,
        "x2": 850.73,
        "y2": 497.7,
        "width": 40.39,
        "height": 79.08
      }
    }
  ],
  "total_detections": 1,
  "person_detections": 1,
  "hazard_detections": 0,
  "image_width": 1280,
  "image_height": 720,
  "annotated_image_url": "/media/detections/fbe69e1e_sar_test_person_annotated.jpg",
  "error": null
}
```

---

### 2.2 `GET /api/v1/detection/health`
Returns operational diagnostic metrics for the YOLO subsystem.

#### Sample Response (`HTTP 200 OK`):
```json
{
  "status": "ok",
  "service": "yolo-detection",
  "yolo_service_ready": true,
  "package_available": true,
  "model_exists": true,
  "model_loaded": true,
  "model_name": "yolov8n.pt",
  "active_model": "yolov8n.pt",
  "detection_mode": "TEST_IMAGE",
  "engine": "ultralytics_yolov8"
}
```

---

### 2.3 `GET /api/v1/detection/history?limit=20`
Returns a chronological list of recent detection submissions.

#### Sample Response (`HTTP 200 OK`):
```json
[
  {
    "image_id": "fbe69e1e",
    "filename": "sar_test_person.jpg",
    "original_filename": "sar_test_person.jpg",
    "timestamp": "2026-09-21T19:00:43.766795+00:00",
    "mode": "TEST_IMAGE",
    "data_mode": "TEST_IMAGE",
    "total_detections": 1,
    "person_count": 1,
    "person_detections": 1,
    "hazard_count": 0,
    "hazard_detections": 0,
    "annotated_image_url": "/media/detections/fbe69e1e_sar_test_person_annotated.jpg",
    "model_used": "yolov8n.pt",
    "conf_threshold": 0.25
  }
]
```

---

### 2.4 `GET /api/v1/detection/summary`
Returns live aggregate counts for the top dashboard overview cards.

#### Sample Response (`HTTP 200 OK`):
```json
{
  "data_mode": "test_image",
  "victims_detected": 1,
  "hazards_detected": 0,
  "last_detection_time": "2026-09-21T19:00:43.766795+00:00",
  "total_detections": 1
}
```

---

## 3. Static Media Architecture

FastAPI serves uploaded images and annotated detections via a mounted static directory:
* **Directory**: `c:\Users\FAHAD\Resque Drone\media`
  * `uploads/`: Original uploaded images.
  * `detections/`: Annotated output images with bounding boxes.
  * `sample_sar_drone_test.jpg`: Verified sample image for 1-click frontend testing.
* **URL Mount**: `http://127.0.0.1:8000/media`

---

## 4. Frontend Dashboard Features

The dashboard includes a dedicated **YOLO Neural Vision & Detection Station** accessible directly on the Overview tab or by clicking the **Detection** tab in the navigation bar:

1. **Ingestion & Controls**:
   * **Drag & Drop Zone**: Supports dragover highlighting, file drop, or file browsing (`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`).
   * **Confidence Slider**: Adjustable threshold from 5% (high recall) to 95% (high precision).
   * **Quick-Load Sample SAR Image**: 1-click button loads the pre-configured aerial SAR test image directly from the server.
   * **File Validation**: Rejects non-image formats or files over 15MB with a user-friendly alert.
2. **Annotated Vision Viewport**:
   * Tactical HUD reticles and corner crosshairs.
   * Displays the annotated image output with drawn bounding boxes.
   * Expand button opens full-resolution image in a new browser tab.
3. **Metrics Strip**:
   * Real-time indicators for inference status (`COMPLETE`), detection mode (`TEST_IMAGE`), active model (`yolov8n.pt`), confidence cutoff (`0.25`), and total detected targets.
4. **Detected Targets Breakdown Table**:
   * Tabular listing of each target: target number, class badge, confidence score with progress bar, bounding box coordinates `[X1, Y1, X2, Y2]`, width/height pixel dimensions, and SAR classification note.
5. **Detection History Panel**:
   * Visual cards showing thumbnail, filename, timestamp, target counts, and confidence threshold.
   * Clicking any historical card re-renders that run into the main viewport.

---

## 5. Safety, Simulation & Ethics Compliance

* **Unverified Person Detections**: Detections of class `person` are labeled in the UI as `"Person detection (unverified victim — manual SAR confirmation required)"`.
* **Clear Mode Badges**: Explicitly displays badges:
  * `YOLO ENGINE: READY (yolov8n.pt)`
  * `TEST IMAGE MODE` / `SIMULATION MODE`
  * `CAMERA: NOT CONNECTED`
  * `DRONE: SIMULATION ONLY`
* **Hardware Isolation**: No real drone arming, motors, or flight commands are executed.

---

## 6. How to Run & Verify

### Start the Backend (Port 8000)
```powershell
cd "c:\Users\FAHAD\Resque Drone"
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Start the Frontend (Port 3000)
```powershell
cd "c:\Users\FAHAD\Resque Drone\frontend"
python -m http.server 3000
```

### Run the Automated Integration Suite
```powershell
backend\.venv\Scripts\python.exe scratch\test_yolo_integration.py
```
*(All 8/8 tests pass with 100% success).*

### Run Unit Tests
```powershell
backend\.venv\Scripts\python.exe -m unittest ai\tests\test_yolo_service.py
```
*(All unit tests pass).*
