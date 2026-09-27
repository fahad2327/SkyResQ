"""
SkyResQ AI Ingestion Pipeline
CLI and programmatic runner connecting YOLODetector outputs to the FastAPI backend.
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional

from ai.config.settings import DETECTIONS_API_ENDPOINT, DEFAULT_CONFIDENCE_THRESHOLD
from ai.detection.yolo_detector import YOLODetector


def send_detection_to_backend(
    detection: Dict[str, Any],
    api_endpoint: str = DETECTIONS_API_ENDPOINT
) -> Dict[str, Any]:
    """
    Submits a detection dictionary to the SkyResQ FastAPI backend.
    """
    payload = {
        "class_name": detection["class_name"],
        "confidence": detection["confidence"],
        "bbox": detection["bbox"],
        "source_type": detection.get("source_type", "simulation"),
        "image_reference": detection.get("image_reference"),
        "latitude": detection.get("latitude"),
        "longitude": detection.get("longitude"),
        "is_simulated": detection.get("is_simulated", True),
        "source_model": detection.get("source_model", "YOLOv8-SAR")
    }

    req = urllib.request.Request(
        api_endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=5.0) as resp:
        if resp.status in (200, 201):
            return json.loads(resp.read().decode())
        else:
            raise RuntimeError(f"Backend responded with HTTP {resp.status}")


def run_pipeline(
    mode: str = "sample",
    input_path: Optional[str] = None,
    device_index: int = 0,
    rtsp_url: Optional[str] = None,
    conf_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
    api_endpoint: str = DETECTIONS_API_ENDPOINT,
    send_to_api: bool = True
) -> List[Dict[str, Any]]:
    """
    Executes detection and streams outputs to the SkyResQ API.
    """
    detector = YOLODetector(confidence_threshold=conf_threshold)

    print(f"[SkyResQ AI Pipeline] Mode: {mode.upper()} | Conf Threshold: {conf_threshold}")

    if mode == "sample":
        detections = detector.detect_sample()
    elif mode == "image":
        if not input_path:
            raise ValueError("--path is required for image mode")
        detections = detector.detect_image(input_path)
    elif mode == "video":
        if not input_path:
            raise ValueError("--path is required for video mode")
        detections = detector.detect_video(input_path)
    elif mode == "webcam":
        detections = detector.detect_webcam(device_index)
    elif mode == "rtsp":
        if not rtsp_url:
            raise ValueError("--url is required for rtsp mode")
        detections = detector.detect_rtsp(rtsp_url)
    else:
        raise ValueError(f"Unknown mode: {mode}")

    print(f"[SkyResQ AI Pipeline] Detected {len(detections)} targets.")

    results = []
    for d in detections:
        print(f"  -> Target: {d['class_name']} ({d['confidence'] * 100:.1f}%) | Box: {d['bbox']} | Source: {d['source_type']}")
        if send_to_api:
            try:
                res = send_detection_to_backend(d, api_endpoint=api_endpoint)
                print(f"     [Uploaded] ID: {res.get('detection_id')} | Status: {res.get('status')}")
                results.append(res)
            except Exception as e:
                print(f"     [Upload Failed]: {e}")
                results.append(d)
        else:
            results.append(d)

    return results


def main():
    parser = argparse.ArgumentParser(description="SkyResQ YOLO AI Detection Pipeline")
    parser.add_argument("--mode", choices=["sample", "image", "video", "webcam", "rtsp"], default="sample")
    parser.add_argument("--path", help="Path to image or video file", default=None)
    parser.add_argument("--device", type=int, help="Webcam device index", default=0)
    parser.add_argument("--url", help="RTSP video stream URL", default=None)
    parser.add_argument("--conf", type=float, help="Confidence threshold", default=DEFAULT_CONFIDENCE_THRESHOLD)
    parser.add_argument("--api", help="FastAPI detections endpoint URL", default=DETECTIONS_API_ENDPOINT)
    parser.add_argument("--no-send", action="store_true", help="Do not send to backend API")

    args = parser.parse_args()

    run_pipeline(
        mode=args.mode,
        input_path=args.path,
        device_index=args.device,
        rtsp_url=args.url,
        conf_threshold=args.conf,
        api_endpoint=args.api,
        send_to_api=not args.no_send
    )


if __name__ == "__main__":
    main()
