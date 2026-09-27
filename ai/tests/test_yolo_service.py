"""
Unit Tests for SkyResQ Decoupled YOLOService
"""

import os
import unittest
from pathlib import Path

from ai.yolo_service import YOLOService
from ai.detection_schema import ImageDetectionResponse, DetectionHealthResponse


class TestYOLOService(unittest.TestCase):
    """Test suite for decoupled YOLOService."""

    @classmethod
    def setUpClass(cls):
        cls.service = YOLOService()
        cls.sample_image = Path(r"c:\Users\FAHAD\Resque Drone\ai\sample_data\sar_test_person.jpg")

    def test_health_status(self):
        """Verifies YOLO service health check."""
        health = self.service.get_health_status()
        self.assertIsInstance(health, DetectionHealthResponse)
        self.assertEqual(health.status, "ok")
        self.assertTrue(health.package_available)
        self.assertTrue(health.model_exists)

    def test_real_inference_on_sar_image(self):
        """Tests actual YOLOv8 inference on test aerial image."""
        if not self.sample_image.exists():
            self.skipTest("Sample image not found")

        res = self.service.predict_image(
            image_path=self.sample_image,
            conf_threshold=0.25,
            annotate=False
        )

        self.assertIsInstance(res, ImageDetectionResponse)
        self.assertTrue(res.success)
        self.assertEqual(res.mode, "TEST_IMAGE")
        self.assertGreaterEqual(res.total_detections, 1)

        # Check for person detection
        class_names = [d.class_name.lower() for d in res.detections]
        self.assertIn("person", class_names)

        # Validate bounding box coordinates
        det = next(d for d in res.detections if d.class_name.lower() == "person")
        self.assertGreater(det.confidence, 0.25)
        self.assertLess(det.bbox.x1, det.bbox.x2)
        self.assertLess(det.bbox.y1, det.bbox.y2)

    def test_missing_image_returns_error_response(self):
        """Tests that missing image returns graceful response rather than crashing."""
        res = self.service.predict_image(
            image_path="non_existent_drone_flight_image.jpg",
            conf_threshold=0.25
        )
        self.assertIsInstance(res, ImageDetectionResponse)
        self.assertFalse(res.success)
        self.assertIn("not found", (res.error or "").lower())

    def test_simulation_fallback(self):
        """Tests deterministic simulation inference method."""
        res = self.service._run_simulation_inference(
            image_path="dummy_path.jpg",
            image_id="sim-test-1",
            conf=0.25,
            annotate=False,
            output_annotated_path=None,
            image_url_prefix="/media/detections",
            now_utc="2026-09-22T00:00:00Z"
        )
        self.assertIsInstance(res, ImageDetectionResponse)
        self.assertTrue(res.success)
        self.assertEqual(res.mode, "SIMULATION")
        self.assertGreaterEqual(len(res.detections), 1)


if __name__ == "__main__":
    unittest.main()
