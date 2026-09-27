# SkyResQ AI Model Weights Directory

This directory stores YOLO model weights (`.pt`, `.onnx`, or `.engine` files) used by the SkyResQ detection subsystem.

## Supported Models:
1. **YOLOv8 Nano / Small (`yolov8n.pt`, `yolov8s.pt`)**:
   General object detection on RGB camera feeds for locating persons and vehicles.
2. **YOLOv8-SAR Custom (`yolov8_sar.pt`)**:
   Fine-tuned models specifically trained on aerial search-and-rescue, thermal infrared, and wilderness casualty datasets.
3. **Fire & Smoke Detector (`yolov8_fire_smoke.pt`)**:
   Thermal hotspot and wildfire detection model.

## Safe Fallback:
If no physical `.pt` model weight file is present, `ai.detection.yolo_detector.YOLODetector` automatically runs in safe **Simulation / Synthetic Test Mode**, producing deterministic, fully-validated detection objects without downloading gigabytes of weights or requiring GPU hardware.
