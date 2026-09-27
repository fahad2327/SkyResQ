"""
SkyResQ YOLO Service
Modular object detection service supporting neural YOLOv8 inference,
annotated visual export, and reliable synthetic fallback simulation.

Safety & Ethics:
- All detections without physical ground truth are labeled TEST_IMAGE or SIMULATION.
- Detected humans are labeled as 'person detection' rather than 'confirmed victim'.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any, Union

from ai.config import (
    YOLO_MODEL_PATH,
    DEFAULT_MODEL_NAME,
    DEFAULT_CONF_THRESHOLD,
    DEFAULT_IOU_THRESHOLD,
    COCO_SAR_MAPPINGS,
    PERSON_CLASS_NAMES,
    HAZARD_CLASS_NAMES,
    SAR_TARGET_CLASS_IDS,
    format_class_name
)
from ai.detection_schema import (
    BoundingBox,
    DetectionItem,
    ImageDetectionResponse,
    DetectionHealthResponse
)

logger = logging.getLogger("skyresq.yolo")


class YOLOService:
    """
    Decoupled YOLO model manager and inference service.
    """

    def __init__(self, model_path: Optional[str] = None):
        models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        s_model = os.path.join(models_dir, "yolov8s.pt")
        n_model = os.path.join(models_dir, "yolov8n.pt")
        custom_model = os.path.join(models_dir, "yolov8_custom.pt")

        # Base model handles 80 COCO classes (humans, vehicles, laptops, cell phones, etc.)
        self.model_path = model_path or (s_model if os.path.exists(s_model) else (n_model if os.path.exists(n_model) else YOLO_MODEL_PATH))
        # Custom model handles custom objects (fans, etc.)
        self.custom_model_path = custom_model if os.path.exists(custom_model) else None

        self.model_name = os.path.basename(self.model_path) if self.model_path else DEFAULT_MODEL_NAME
        if self.custom_model_path:
            self.model_name += f" + {os.path.basename(self.custom_model_path)}"

        self._model = None
        self._custom_model = None
        self._model_loaded = False
        self._ultralytics_available = False

        self._check_package_availability()

    def _check_package_availability(self) -> bool:
        """Determines if the ultralytics library is available."""
        try:
            import ultralytics
            self._ultralytics_available = True
            return True
        except ImportError:
            self._ultralytics_available = False
            return False

    def is_available(self) -> bool:
        """Returns True if ultralytics package is installed."""
        return self._ultralytics_available

    def is_model_present(self) -> bool:
        """Checks if configured model weights file exists on disk."""
        return bool(self.model_path and os.path.isfile(self.model_path))

    def load_model(self) -> bool:
        """
        Loads the YOLO model(s) into memory.
        If local weights are missing, attempts to initialize 'yolov8n.pt' which
        Ultralytics will automatically download.
        """
        if self._model_loaded and self._model is not None:
            return True

        if not self.is_available():
            logger.warning("[SkyResQ YOLO] ultralytics package not installed. Running in SIMULATION fallback.")
            self._model_loaded = False
            return False

        try:
            from ultralytics import YOLO
            target_model = self.model_path if self.is_model_present() else "yolov8n.pt"
            logger.info(f"[SkyResQ YOLO] Loading primary YOLO model: {target_model}")
            self._model = YOLO(target_model)
            self._model_loaded = True
            self.model_name = os.path.basename(target_model)

            if self.custom_model_path and os.path.isfile(self.custom_model_path):
                try:
                    logger.info(f"[SkyResQ YOLO] Loading custom trained YOLO model from: {self.custom_model_path}")
                    self._custom_model = YOLO(self.custom_model_path)
                except Exception as c_err:
                    logger.warning(f"[SkyResQ YOLO] Could not load custom weights: {c_err}")
                    self._custom_model = None

            return True
        except Exception as exc:
            logger.error(f"[SkyResQ YOLO] Failed to load model '{self.model_path}': {exc}")
            self._model = None
            self._model_loaded = False
            return False

    def get_health_status(self) -> DetectionHealthResponse:
        """Returns comprehensive health and readiness state."""
        self._check_package_availability()
        model_exists = self.is_model_present() or self._model_loaded
        detection_mode = "LIVE_YOLO" if (self._ultralytics_available and (model_exists or self._model_loaded)) else "SIMULATION"

        return DetectionHealthResponse(
            status="ok",
            service="yolo-detection",
            package_available=self._ultralytics_available,
            model_exists=model_exists,
            model_loaded=self._model_loaded,
            model_name=self.model_name,
            detection_mode=detection_mode
        )

    def predict_image(
        self,
        image_path: Union[str, Path],
        conf_threshold: Optional[float] = None,
        annotate: bool = True,
        output_annotated_path: Optional[Union[str, Path]] = None,
        image_url_prefix: str = "/media/detections"
    ) -> ImageDetectionResponse:
        """
        Executes YOLO inference on an image file.

        :param image_path: Path to the input image.
        :param conf_threshold: Detection confidence threshold (0.0 to 1.0).
        :param annotate: If True, writes bounding box visual to output_annotated_path.
        :param output_annotated_path: Destination file path for annotated image.
        :param image_url_prefix: Base URL path returned to frontend for image fetching.
        :returns: ImageDetectionResponse matching the SkyResQ specification.
        """
        conf = conf_threshold if conf_threshold is not None else DEFAULT_CONF_THRESHOLD
        image_path = str(image_path)
        image_id = str(uuid.uuid4())[:8]
        now_utc = datetime.now(timezone.utc).isoformat()

        if not os.path.exists(image_path):
            return ImageDetectionResponse(
                success=False,
                mode="TEST_IMAGE",
                source="uploaded_image",
                image_id=image_id,
                timestamp=now_utc,
                model_name=self.model_name,
                confidence_threshold=conf,
                detections=[],
                total_detections=0,
                error=f"Source image not found: {os.path.basename(image_path)}"
            )

        # Attempt to load model if available
        if self.is_available() and not self._model_loaded:
            self.load_model()

        if self._model_loaded and self._model is not None:
            return self._run_real_inference(
                image_path=image_path,
                image_id=image_id,
                conf=conf,
                annotate=annotate,
                output_annotated_path=output_annotated_path,
                image_url_prefix=image_url_prefix,
                now_utc=now_utc
            )
        else:
            return self._run_simulation_inference(
                image_path=image_path,
                image_id=image_id,
                conf=conf,
                annotate=annotate,
                output_annotated_path=output_annotated_path,
                image_url_prefix=image_url_prefix,
                now_utc=now_utc
            )

    def _run_real_inference(
        self,
        image_path: str,
        image_id: str,
        conf: float,
        annotate: bool,
        output_annotated_path: Optional[Union[str, Path]],
        image_url_prefix: str,
        now_utc: str
    ) -> ImageDetectionResponse:
        """Executes actual Ultralytics neural YOLO detection."""
        try:
            def _extract_dets(res_obj, offset_cls=0):
                extracted = []
                if res_obj and res_obj.boxes is not None:
                    names_map = res_obj.names or {}
                    for b in res_obj.boxes:
                        sc = float(b.conf[0])
                        if sc < conf:
                            continue
                        c_id = int(b.cls[0])
                        r_name = names_map.get(c_id, f"class_{c_id}").lower().strip()
                        c_name = format_class_name(r_name)
                        cds = b.xyxy[0].tolist()
                        box_obj = BoundingBox(
                            x1=round(float(cds[0]), 2),
                            y1=round(float(cds[1]), 2),
                            x2=round(float(cds[2]), 2),
                            y2=round(float(cds[3]), 2)
                        )
                        extracted.append(
                            DetectionItem(
                                class_id=c_id + offset_cls,
                                class_name=c_name,
                                confidence=round(sc, 4),
                                bbox=box_obj
                            )
                        )
                return extracted

            def _compute_iou(b1: BoundingBox, b2: BoundingBox) -> float:
                ix1 = max(b1.x1, b2.x1)
                iy1 = max(b1.y1, b2.y1)
                ix2 = min(b1.x2, b2.x2)
                iy2 = min(b1.y2, b2.y2)
                inter_w = max(0.0, ix2 - ix1)
                inter_h = max(0.0, iy2 - iy1)
                inter_area = inter_w * inter_h
                if inter_area <= 0.0:
                    return 0.0
                area1 = max(0.0, b1.x2 - b1.x1) * max(0.0, b1.y2 - b1.y1)
                area2 = max(0.0, b2.x2 - b2.x1) * max(0.0, b2.y2 - b2.y1)
                union_area = area1 + area2 - inter_area
                if union_area <= 0.0:
                    return 0.0
                return inter_area / union_area

            predict_kwargs = {
                "source": image_path,
                "conf": conf,
                "iou": DEFAULT_IOU_THRESHOLD,
                "verbose": False
            }
            if SAR_TARGET_CLASS_IDS:
                predict_kwargs["classes"] = SAR_TARGET_CLASS_IDS

            raw_detections: List[DetectionItem] = []

            # 1. Base model detection (COCO 80 classes: persons, smart phones, laptops, etc.)
            if self._model:
                base_results = self._model.predict(**predict_kwargs)
                if base_results and len(base_results) > 0:
                    raw_detections.extend(_extract_dets(base_results[0], offset_cls=0))

            # 2. Custom model detection (custom classes e.g. fan, custom items)
            if self._custom_model:
                custom_results = self._custom_model.predict(**predict_kwargs)
                if custom_results and len(custom_results) > 0:
                    raw_detections.extend(_extract_dets(custom_results[0], offset_cls=1000))

            # 3. Non-Maximum Suppression (NMS) deduplication across models
            detections: List[DetectionItem] = []
            for item in sorted(raw_detections, key=lambda d: d.confidence, reverse=True):
                keep = True
                for accepted in detections:
                    iou = _compute_iou(item.bbox, accepted.bbox)
                    if iou > 0.45:
                        keep = False
                        break
                if keep:
                    detections.append(item)

            # Generate tactical annotated visual
            annotated_url = None
            if annotate and output_annotated_path:
                import cv2
                out_path = Path(output_annotated_path)
                out_path.parent.mkdir(parents=True, exist_ok=True)

                frame = cv2.imread(str(image_path))
                if frame is not None:
                    for det in detections:
                        b = det.bbox
                        x1, y1, x2, y2 = int(b.x1), int(b.y1), int(b.x2), int(b.y2)
                        cls_clean = det.class_name.lower()
                        is_person = cls_clean in PERSON_CLASS_NAMES
                        is_hazard = cls_clean in HAZARD_CLASS_NAMES

                        color = (255, 240, 0) if is_person else ((0, 69, 255) if is_hazard else (0, 215, 255))

                        # Bounding box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                        # Corner accent reticles
                        c_len = min(14, max(4, (x2 - x1) // 5))
                        cv2.line(frame, (x1, y1), (x1 + c_len, y1), color, 3)
                        cv2.line(frame, (x1, y1), (x1, y1 + c_len), color, 3)
                        cv2.line(frame, (x2, y1), (x2 - c_len, y1), color, 3)
                        cv2.line(frame, (x2, y1), (x2, y1 + c_len), color, 3)
                        cv2.line(frame, (x1, y2), (x1 + c_len, y2), color, 3)
                        cv2.line(frame, (x1, y2), (x1, y2 - c_len), color, 3)
                        cv2.line(frame, (x2, y2), (x2 - c_len, y2), color, 3)
                        cv2.line(frame, (x2, y2), (x2, y2 - c_len), color, 3)

                        # Label badge
                        label = f"{det.class_name} {int(det.confidence * 100)}%"
                        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 1)
                        badge_y1 = max(0, y1 - 20)
                        badge_y2 = max(20, y1)
                        cv2.rectangle(frame, (x1, badge_y1), (x1 + tw + 10, badge_y2), (15, 23, 42), -1)
                        cv2.rectangle(frame, (x1, badge_y1), (x1 + tw + 10, badge_y2), color, 1)
                        cv2.putText(frame, label, (x1 + 5, badge_y2 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.52, color, 1, cv2.LINE_AA)

                    cv2.imwrite(str(out_path), frame)
                    annotated_url = f"{image_url_prefix}/{out_path.name}"

            return ImageDetectionResponse(
                success=True,
                mode="TEST_IMAGE",
                source="uploaded_image",
                image_id=image_id,
                timestamp=now_utc,
                model_name=self.model_name,
                confidence_threshold=conf,
                detections=detections,
                total_detections=len(detections),
                annotated_image_url=annotated_url
            )

        except Exception as err:
            logger.error(f"[SkyResQ YOLO] Inference execution failure: {err}")
            # Fall back to simulation on runtime error rather than crashing
            return self._run_simulation_inference(
                image_path=image_path,
                image_id=image_id,
                conf=conf,
                annotate=annotate,
                output_annotated_path=output_annotated_path,
                image_url_prefix=image_url_prefix,
                now_utc=now_utc,
                error_note=f"Neural inference fallback: {err}"
            )

    def _run_simulation_inference(
        self,
        image_path: str,
        image_id: str,
        conf: float,
        annotate: bool,
        output_annotated_path: Optional[Union[str, Path]],
        image_url_prefix: str,
        now_utc: str,
        error_note: Optional[str] = None
    ) -> ImageDetectionResponse:
        """
        Produces realistic, clearly flagged synthetic test detections
        when no physical .pt model weight is present.
        """
        # Read image to determine real pixel dimensions
        img_w, img_h = 800, 600
        try:
            import cv2
            src_img = cv2.imread(image_path)
            if src_img is not None:
                img_h, img_w = src_img.shape[:2]
        except Exception:
            src_img = None

        # Generate sample test bounding boxes proportional to image dimensions
        detections: List[DetectionItem] = [
            DetectionItem(
                class_id=0,
                class_name="person",
                confidence=round(max(0.75, conf + 0.1), 4),
                bbox=BoundingBox(
                    x1=round(img_w * 0.35, 2),
                    y1=round(img_h * 0.25, 2),
                    x2=round(img_w * 0.52, 2),
                    y2=round(img_h * 0.70, 2)
                )
            ),
            DetectionItem(
                class_id=2,
                class_name="vehicle",
                confidence=round(max(0.68, conf + 0.05), 4),
                bbox=BoundingBox(
                    x1=round(img_w * 0.08, 2),
                    y1=round(img_h * 0.40, 2),
                    x2=round(img_w * 0.28, 2),
                    y2=round(img_h * 0.65, 2)
                )
            )
        ]

        # Draw tactical annotation boxes onto the image with OpenCV if available
        annotated_url = None
        if annotate and output_annotated_path:
            out_path = Path(output_annotated_path)
            out_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                import cv2
                if src_img is not None:
                    draw_img = src_img.copy()
                else:
                    draw_img = cv2.imread(image_path)

                if draw_img is not None:
                    for det in detections:
                        x1, y1 = int(det.bbox.x1), int(det.bbox.y1)
                        x2, y2 = int(det.bbox.x2), int(det.bbox.y2)

                        # Color: Cyan for person, Amber for vehicle/hazard
                        color = (255, 240, 0) if det.class_name == "person" else (11, 158, 245)
                        cv2.rectangle(draw_img, (x1, y1), (x2, y2), color, 2)

                        # Tactical banner label
                        label = f"{det.class_name.upper()} [SIM] {det.confidence * 100:.1f}%"
                        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
                        cv2.rectangle(draw_img, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)
                        cv2.putText(
                            draw_img,
                            label,
                            (x1 + 3, y1 - 4),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.55,
                            (10, 10, 15),
                            1,
                            cv2.LINE_AA
                        )

                    # Top watermark badge
                    cv2.putText(
                        draw_img,
                        "[SkyResQ AI - TEST IMAGE / SIMULATION MODE]",
                        (14, 28),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.65,
                        (0, 240, 255),
                        2,
                        cv2.LINE_AA
                    )

                    cv2.imwrite(str(out_path), draw_img)
                    annotated_url = f"{image_url_prefix}/{out_path.name}"
            except Exception as draw_err:
                logger.warning(f"[SkyResQ YOLO] Failed to annotate simulation visual: {draw_err}")

        model_label = f"{self.model_name} (Simulation Mode)"
        if error_note:
            model_label += f" - {error_note}"

        return ImageDetectionResponse(
            success=True,
            mode="SIMULATION",
            source="uploaded_image",
            image_id=image_id,
            timestamp=now_utc,
            model_name=model_label,
            confidence_threshold=conf,
            detections=detections,
            total_detections=len(detections),
            annotated_image_url=annotated_url,
            error=error_note
        )


# Global singleton instance for app-wide reuse
yolo_service = YOLOService()
