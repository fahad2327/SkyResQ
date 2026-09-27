# SkyResQ Independent - AI YOLO Detection Subsystem

The **AI YOLO Detection Subsystem** provides neural computer vision and object detection capabilities for the **SkyResQ Independent** aerial search and rescue (SAR) dashboard. It is completely decoupled from FastAPI routing and web delivery concerns, offering modular inference, bounding-box annotations, and fallback mechanisms.

---

## 1. Architecture Overview

```
[Local Aerial / SAR Image]
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                       YOLOService                           │
│  (ai/yolo_service.py)                                       │
│                                                             │
│  - Singleton lifecycle management                           │
│  - Lazy-loading weights (yolov8n.pt / custom .pt)           │
│  - Ultralytics inference with IOU/NMS thresholding          │
│  - SAR class mapping (COCO -> SAR taxonomy)                 │
│  - Bounding box rendering via OpenCV & Ultralytics plot()   │
│  - Deterministic simulation fallback                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 ImageDetectionResponse                      │
│  (ai/detection_schema.py)                                   │
│                                                             │
│  - Pure Python / Pydantic schema                            │
│  - Bounding box coordinates [x1, y1, x2, y2] + dimensions   │
│  - Confidence score & mapped SAR category                   │
│  - Annotated image URL (/media/detections/...)              │
│  - Operational metadata (mode: TEST_IMAGE / SIMULATION)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout

```
ai/
├── __init__.py                 # Module exports (YOLOService, yolo_service, schemas)
├── config/
│   ├── __init__.py             # Config package exports
│   └── settings.py             # Model paths, thresholds, and SAR class taxonomies
├── detection_schema.py         # Standard Pydantic schemas (BoundingBox, DetectionItem, etc.)
├── yolo_service.py             # Decoupled YOLO inference & annotation engine
├── models/
│   └── yolov8n.pt              # Official pre-trained YOLOv8 Nano weights (6.2 MB)
├── sample_data/
│   └── sar_test_person.jpg     # Verified aerial search & rescue test imagery
├── tests/
│   ├── __init__.py
│   └── test_yolo_service.py    # Unit test suite for YOLOService
└── README.md                   # This documentation
```

---

## 3. Configuration & Weights

Settings are defined in `ai/config/settings.py`:

* **`DEFAULT_MODEL_NAME`**: `"yolov8n.pt"`
* **`YOLO_MODEL_PATH`**: Points to `ai/models/yolov8n.pt` by default. Can also detect weights in root directory or custom paths.
* **`DEFAULT_CONF_THRESHOLD`**: `0.25` (25% default confidence cutoff)
* **`DEFAULT_IOU_THRESHOLD`**: `0.45` (Intersection-over-union for Non-Maximum Suppression)
* **`COCO_SAR_MAPPINGS`**: Translates COCO class identifiers into search and rescue terminology:
  * `person` → `person` (labeled strictly as *unverified person detection*)
  * `car`, `truck`, `bus`, `motorcycle` → `vehicle`
  * `boat` → `watercraft`
  * `airplane` → `aircraft`

---

## 4. Usage in Python

```python
from ai import yolo_service

# 1. Check subsystem health & loaded weights
health = yolo_service.get_health_status()
print(health.status, health.active_model)  # "ok", "yolov8n.pt"

# 2. Run inference on an image
result = yolo_service.predict_image(
    image_path="ai/sample_data/sar_test_person.jpg",
    conf_threshold=0.25,
    annotate=True,
    output_annotated_path="media/detections/output_annotated.jpg",
    image_url_prefix="/media/detections"
)

# 3. Inspect structured detections
print(f"Total detections: {result.total_detections}")
for item in result.detections:
    print(f"Target: {item.class_name}, Conf: {item.confidence:.2%}")
    print(f"Box: [{item.bbox.x1}, {item.bbox.y1}, {item.bbox.x2}, {item.bbox.y2}]")
```

---

## 5. Simulation Fallback & Reliability

If `ultralytics` or PyTorch is not available, or model weights are missing, `YOLOService` does **not crash**. Instead, it gracefully enters `SIMULATION` mode:
* Returns structured simulation detections.
* Annotates the input image with cyan simulation reticles and bounding boxes using OpenCV.
* Sets `mode = "SIMULATION"` and `data_mode = "SIMULATION"`.
* The dashboard UI visibly displays `SIMULATION MODE` / `TEST IMAGE MODE`.

---

## 6. Safety & Ethical Guidelines

* **Person Detections vs Confirmed Victims**: Detections labeled `person` represent preliminary computer vision detections. They must **never** be labeled as "confirmed victims" without manual human SAR operator validation.
* **Hardware Independence**: The vision module processes local test imagery. It does **not** command real drone avionics or declare real hardware cameras live.
