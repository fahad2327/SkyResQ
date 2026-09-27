"""
SkyResQ - Python YOLO Client Integration Example
=================================================
This clean, lightweight script illustrates how your external Python YOLO system
(e.g., using Ultralytics YOLOv8, OpenCV, or PyTorch) can send real-time detection
results to the SkyResQ dashboard via FastAPI HTTP POST.

No heavy AI dependencies are required for this sender script.
"""

import json
import time
import urllib.request
from typing import Optional, Dict, Any


def send_yolo_detection(
    class_name: str,
    confidence: float,
    bbox: Dict[str, float],
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    image_reference: Optional[str] = None,
    is_simulated: bool = False,
    api_url: str = "http://127.0.0.1:8000/api/v1/detections"
) -> Dict[str, Any]:
    """
    Sends an object detection event to the SkyResQ dashboard.

    :param class_name: Target label detected (e.g. 'person', 'hazard', 'survivor')
    :param confidence: Detection confidence score (0.0 to 1.0)
    :param bbox: Dict with keys {'x1': float, 'y1': float, 'x2': float, 'y2': float}
    :param latitude: Drone GPS latitude when target was spotted (optional)
    :param longitude: Drone GPS longitude when target was spotted (optional)
    :param image_reference: Filename, URL, or identifier of the captured frame
    :param is_simulated: Set False when streaming from a live optical/thermal camera
    :param api_url: Target SkyResQ API endpoint
    :return: Server response dictionary containing assigned detection ID and status
    """
    payload = {
        "class_name": class_name,
        "confidence": round(float(confidence), 4),
        "bbox": bbox,
        "latitude": latitude,
        "longitude": longitude,
        "image_reference": image_reference,
        "is_simulated": is_simulated,
        "source_model": "YOLOv8-Rescue-Edge"
    }

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=5.0) as response:
        if response.status == 201:
            result = json.loads(response.read().decode())
            print(f"[SkyResQ Client] Successfully sent detection: {result['detection_id']} "
                  f"({result['class_name']} @ {result['confidence'] * 100:.1f}%)")
            return result
        else:
            raise RuntimeError(f"Server returned unexpected status code: {response.status}")


# ==============================================================================
# Operational Test: Telemetry target ingestion from active aerial flight
# ==============================================================================
if __name__ == "__main__":
    print("=== SkyResQ Python YOLO Integration Pipeline ===")
    print("Posting sample detection to http://127.0.0.1:8000/api/v1/detections...\n")

    # Example 1: Person spotted on Mount Wilson trail
    res1 = send_yolo_detection(
        class_name="person",
        confidence=0.972,
        bbox={"x1": 310.0, "y1": 190.0, "x2": 440.0, "y2": 405.0},
        latitude=34.2529,
        longitude=-118.1506,
        image_reference="thermal_frame_1042.jpg",
        is_simulated=True
    )
    print("Response received:", json.dumps(res1, indent=2))

    time.sleep(1.0)

    # Example 2: Hazard / Hotspot spotted
    res2 = send_yolo_detection(
        class_name="hazard",
        confidence=0.895,
        bbox={"x1": 180.0, "y1": 210.0, "x2": 320.0, "y2": 350.0},
        latitude=34.2543,
        longitude=-118.1534,
        image_reference="thermal_frame_1043.jpg",
        is_simulated=True
    )
    print("\nResponse received:", json.dumps(res2, indent=2))
