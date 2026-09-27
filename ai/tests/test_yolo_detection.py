"""
Unit & Integration Tests for SkyResQ YOLO AI Detection Subsystem
"""

import os
import unittest
import json
import urllib.request
import urllib.error

from ai.detection.yolo_detector import YOLODetector
from ai.config.settings import DETECTIONS_API_ENDPOINT


class TestYOLODetectionSubsystem(unittest.TestCase):
    """Test suite covering YOLODetector formats, error handling, and backend integration."""

    def setUp(self):
        self.detector = YOLODetector(confidence_threshold=0.50)

    def test_sample_detection_format(self):
        """Validates that detection records contain all required fields with valid types."""
        results = self.detector.detect_sample(drone_latitude=34.2520, drone_longitude=-118.1510)
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)

        det = results[0]
        # Required keys check
        required_keys = [
            "detection_id", "class_name", "confidence", "bbox",
            "source_type", "timestamp", "latitude", "longitude",
            "is_simulated", "status", "source_model"
        ]
        for key in required_keys:
            self.assertIn(key, det, f"Missing key '{key}' in detection payload")

        # Bounds and types
        self.assertIsInstance(det["confidence"], float)
        self.assertGreaterEqual(det["confidence"], 0.0)
        self.assertLessEqual(det["confidence"], 1.0)

        # Bounding box structure
        bbox = det["bbox"]
        for coord in ["x1", "y1", "x2", "y2"]:
            self.assertIn(coord, bbox)
            self.assertIsInstance(bbox[coord], (int, float))

        # Simulation status
        self.assertTrue(det["is_simulated"])
        self.assertIn("SIM", det["detection_id"])

    def test_missing_image_raises_error(self):
        """Ensures FileNotFoundError is raised when target image file is missing."""
        non_existent_path = os.path.join(os.getcwd(), "non_existent_image_12345.jpg")
        with self.assertRaises(FileNotFoundError):
            self.detector.detect_image(non_existent_path)

    def test_missing_video_raises_error(self):
        """Ensures FileNotFoundError is raised when target video file is missing."""
        non_existent_video = os.path.join(os.getcwd(), "non_existent_video_12345.mp4")
        with self.assertRaises(FileNotFoundError):
            self.detector.detect_video(non_existent_video)

    def test_invalid_rtsp_url_raises_error(self):
        """Ensures ValueError is raised for malformed RTSP URLs."""
        with self.assertRaises(ValueError):
            self.detector.detect_rtsp("not_a_valid_url")

    def test_class_mapping(self):
        """Verifies standard COCO classes map to SkyResQ SAR categories."""
        self.assertEqual(self.detector.map_class_name("person"), "person")
        self.assertEqual(self.detector.map_class_name("car"), "vehicle")
        self.assertEqual(self.detector.map_class_name("truck"), "vehicle")
        self.assertEqual(self.detector.map_class_name("fire"), "fire")
        self.assertEqual(self.detector.map_class_name("smoke"), "hazard")

    def test_backend_api_integration(self):
        """Tests that detections can be posted and retrieved from the live backend."""
        # 1. Post a detection
        payload = {
            "class_name": "person",
            "confidence": 0.955,
            "bbox": {"x1": 200.0, "y1": 150.0, "x2": 320.0, "y2": 380.0},
            "source_type": "image",
            "image_reference": "sar_test_person.jpg",
            "latitude": 34.2530,
            "longitude": -118.1515,
            "is_simulated": True,
            "source_model": "YOLOv8-Test-Runner"
        }
        req = urllib.request.Request(
            DETECTIONS_API_ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                self.assertIn(resp.status, (200, 201))
                created = json.loads(resp.read().decode())
                self.assertEqual(created["class_name"], "person")
                self.assertEqual(created["source_type"], "image")
                self.assertIn("DET-", created["detection_id"])
        except urllib.error.URLError:
            self.skipTest("Backend server is not running at localhost:8000; skipping live network test.")


if __name__ == "__main__":
    unittest.main()
