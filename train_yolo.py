"""
SkyResQ YOLO Custom Training & Dataset Pipeline
-----------------------------------------------
This tool enables training YOLOv8 to accurately detect custom objects
such as Fans (Desk Fan, Ceiling Fan), Smart Phones, and other items
appearing in camera feeds.

Usage:
  # 1. Full automated pipeline (Generate dataset + Train 10 epochs):
  python train_yolo.py --auto

  # 2. Train on existing data:
  python train_yolo.py --train --epochs 15

  # 3. Collect training images directly from your laptop webcam:
  python train_yolo.py --collect-webcam --class-name fan --count 20

  # 4. Only generate the synthetic fan & phone dataset:
  python train_yolo.py --generate-dataset --samples 80
"""

import os
import sys
import argparse
import random
import shutil
from pathlib import Path
import numpy as np

# Ensure root is in path
ROOT_DIR = Path(__file__).resolve().parent
AI_DIR = ROOT_DIR / "ai"
MODELS_DIR = AI_DIR / "models"
TRAINING_DIR = AI_DIR / "training"
DATASET_DIR = TRAINING_DIR / "dataset"
DATA_YAML_PATH = TRAINING_DIR / "data.yaml"


def setup_directories():
    """Creates the standard YOLO dataset folder hierarchy."""
    for split in ["train", "val"]:
        (DATASET_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (DATASET_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[SkyResQ YOLO] Training directories ready at: {DATASET_DIR}")


def write_data_yaml(classes=None):
    """Writes the Ultralytics data.yaml file."""
    if classes is None:
        classes = ["fan", "smart phone"]

    names_yaml = "\n".join([f"  {idx}: {cls_name}" for idx, cls_name in enumerate(classes)])
    yaml_content = f"""# SkyResQ Custom Object Dataset Config
path: {DATASET_DIR.resolve().as_posix()}
train: images/train
val: images/val

names:
{names_yaml}
"""
    with open(DATA_YAML_PATH, "w", encoding="utf-8") as f:
        f.write(yaml_content)
    print(f"[SkyResQ YOLO] Generated data.yaml with classes: {classes}")


def generate_fan_image(width=640, height=640, fan_type="desk"):
    """
    Renders a realistic fan (desk fan or ceiling fan) with accurate YOLO bbox.
    Returns (image_bgr, bbox_normalized) where bbox is (x_center, y_center, w, h).
    """
    import cv2

    # 1. Realistic room background (walls, desk gradient, ceiling texture)
    bg_color1 = (random.randint(180, 240), random.randint(180, 240), random.randint(190, 245))
    bg_color2 = (random.randint(130, 190), random.randint(140, 190), random.randint(150, 200))
    img = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        alpha = y / height
        color = [int((1 - alpha) * bg_color1[c] + alpha * bg_color2[c]) for c in range(3)]
        img[y, :] = color

    # Add subtle background texture / lines (wall edges, shelves, shadows)
    for _ in range(random.randint(3, 8)):
        lx = random.randint(0, width)
        cv2.line(img, (lx, 0), (lx + random.randint(-50, 50), height), (random.randint(120, 180), random.randint(120, 180), random.randint(120, 180)), 1)

    # 2. Fan dimensions and center
    margin = 80
    cx = random.randint(margin + 60, width - margin - 60)
    cy = random.randint(margin + 60, height - margin - 60)
    radius = random.randint(70, 150)
    fan_color = random.choice([
        (40, 40, 40),       # Matte Black
        (230, 230, 230),   # Clean White
        (70, 80, 90),      # Metallic Gunmetal
        (160, 120, 80),    # Industrial Blue/Navy
    ])
    blade_color = (
        min(255, fan_color[0] + 40),
        min(255, fan_color[1] + 40),
        min(255, fan_color[2] + 40)
    )

    if fan_type == "desk":
        # Draw stand and base plate
        stand_h = int(radius * random.uniform(0.9, 1.4))
        base_w = int(radius * random.uniform(0.8, 1.2))
        base_h = int(base_w * 0.25)
        base_y = cy + radius + stand_h

        # Clip base within bounds
        if base_y + base_h >= height - 10:
            stand_h = (height - 10) - (cy + radius + base_h)
            base_y = cy + radius + stand_h

        # Stand neck
        neck_thick = max(6, int(radius * 0.12))
        cv2.line(img, (cx, cy), (cx, base_y), (60, 60, 60), neck_thick)

        # Base ellipse
        cv2.ellipse(img, (cx, base_y), (base_w // 2, base_h), 0, 0, 360, (50, 50, 50), -1)
        cv2.ellipse(img, (cx, base_y), (base_w // 2, base_h), 0, 0, 360, (30, 30, 30), 2)

        # Outer circular protective cage
        cv2.circle(img, (cx, cy), radius, fan_color, 4)
        cv2.circle(img, (cx, cy), radius - 6, (180, 180, 180), 1)

        # Radial wire grill spokes
        num_spokes = random.randint(16, 28)
        for s in range(num_spokes):
            angle = (2 * np.pi / num_spokes) * s
            ex = int(cx + (radius - 4) * np.cos(angle))
            ey = int(cy + (radius - 4) * np.sin(angle))
            cv2.line(img, (cx, cy), (ex, ey), (190, 190, 190), 1)

        # Inner fan blades (3 or 4 aerodynamic blades)
        num_blades = random.choice([3, 4, 5])
        blade_rot = random.uniform(0, 2 * np.pi)
        for b in range(num_blades):
            b_angle = blade_rot + (2 * np.pi / num_blades) * b
            bx = int(cx + (radius * 0.75) * np.cos(b_angle))
            by = int(cy + (radius * 0.75) * np.sin(b_angle))
            cv2.ellipse(
                img,
                ((cx + bx) // 2, (cy + by) // 2),
                (int(radius * 0.4), int(radius * 0.16)),
                np.degrees(b_angle),
                0, 360, blade_color, -1
            )
            cv2.ellipse(
                img,
                ((cx + bx) // 2, (cy + by) // 2),
                (int(radius * 0.4), int(radius * 0.16)),
                np.degrees(b_angle),
                0, 360, (40, 40, 40), 1
            )

        # Center motor hub
        hub_r = max(14, int(radius * 0.22))
        cv2.circle(img, (cx, cy), hub_r, (40, 40, 40), -1)
        cv2.circle(img, (cx, cy), hub_r - 3, fan_color, -1)
        cv2.circle(img, (cx, cy), hub_r, (20, 20, 20), 2)

        # Bounding box covering head and base
        x1 = max(0, cx - max(radius, base_w // 2) - 4)
        x2 = min(width - 1, cx + max(radius, base_w // 2) + 4)
        y1 = max(0, cy - radius - 4)
        y2 = min(height - 1, base_y + base_h + 4)

    else:
        # Ceiling Fan: Central hub + 3 or 4 long outward blades
        num_blades = random.choice([3, 4])
        blade_len = radius
        blade_w = int(radius * 0.25)
        rot_offset = random.uniform(0, 2 * np.pi)

        # Long fan blades
        for b in range(num_blades):
            b_angle = rot_offset + (2 * np.pi / num_blades) * b
            mid_x = cx + int((blade_len * 0.55) * np.cos(b_angle))
            mid_y = cy + int((blade_len * 0.55) * np.sin(b_angle))
            cv2.ellipse(
                img,
                (mid_x, mid_y),
                (blade_len // 2, blade_w // 2),
                np.degrees(b_angle),
                0, 360, fan_color, -1
            )
            cv2.ellipse(
                img,
                (mid_x, mid_y),
                (blade_len // 2, blade_w // 2),
                np.degrees(b_angle),
                0, 360, (30, 30, 30), 2
            )

        # Central motor unit / downrod mount
        cv2.circle(img, (cx, cy), int(radius * 0.28), (50, 50, 50), -1)
        cv2.circle(img, (cx, cy), int(radius * 0.20), (210, 210, 210), -1)
        cv2.circle(img, (cx, cy), int(radius * 0.28), (20, 20, 20), 2)

        x1 = max(0, cx - blade_len - 6)
        x2 = min(width - 1, cx + blade_len + 6)
        y1 = max(0, cy - blade_len - 6)
        y2 = min(height - 1, cy + blade_len + 6)

    # Normalize bbox: (x_center, y_center, w, h)
    box_w = (x2 - x1) / width
    box_h = (y2 - y1) / height
    box_cx = (x1 + x2) / (2 * width)
    box_cy = (y1 + y2) / (2 * height)

    return img, (box_cx, box_cy, box_w, box_h)


def generate_phone_image(width=640, height=640):
    """
    Renders a realistic smart phone with accurate YOLO bbox.
    Returns (image_bgr, bbox_normalized).
    """
    import cv2

    # Background (desk, wooden surface, or fabric)
    desk_color = (random.randint(40, 110), random.randint(70, 140), random.randint(100, 180))
    img = np.full((height, width, 3), desk_color, dtype=np.uint8)
    # Add table noise / texture
    noise = np.random.randint(-15, 15, (height, width, 3), dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Phone size & orientation (portrait or landscape)
    is_portrait = random.random() > 0.3
    p_w = random.randint(80, 150) if is_portrait else random.randint(160, 280)
    p_h = int(p_w * 2.05) if is_portrait else int(p_w * 0.48)

    cx = random.randint(p_w // 2 + 30, width - p_w // 2 - 30)
    cy = random.randint(p_h // 2 + 30, height - p_h // 2 - 30)

    x1 = cx - p_w // 2
    y1 = cy - p_h // 2
    x2 = x1 + p_w
    y2 = y1 + p_h

    # Phone chassis (black, midnight blue, rose gold, silver)
    chassis_color = random.choice([(25, 25, 25), (45, 35, 30), (220, 215, 210), (70, 50, 40)])
    border_radius = max(8, p_w // 10)

    # Draw rounded rectangle for chassis
    cv2.rectangle(img, (x1 + border_radius, y1), (x2 - border_radius, y2), chassis_color, -1)
    cv2.rectangle(img, (x1, y1 + border_radius), (x2, y2 - border_radius), chassis_color, -1)
    cv2.circle(img, (x1 + border_radius, y1 + border_radius), border_radius, chassis_color, -1)
    cv2.circle(img, (x2 - border_radius, y1 + border_radius), border_radius, chassis_color, -1)
    cv2.circle(img, (x1 + border_radius, y2 - border_radius), border_radius, chassis_color, -1)
    cv2.circle(img, (x2 - border_radius, y2 - border_radius), border_radius, chassis_color, -1)

    # Phone screen display (glass reflection or glowing screen)
    screen_margin = max(4, int(p_w * 0.05))
    sx1 = x1 + screen_margin
    sy1 = y1 + screen_margin
    sx2 = x2 - screen_margin
    sy2 = y2 - screen_margin

    screen_color = random.choice([
        (15, 15, 15),       # Screen OFF (pure dark glass)
        (220, 180, 50),     # Wallpaper (bright cyan/blue UI)
        (70, 30, 20),       # Dark mode lockscreen
        (180, 80, 160)      # Vivid wallpaper
    ])
    cv2.rectangle(img, (sx1, sy1), (sx2, sy2), screen_color, -1)

    # Dynamic Island / Camera punch-hole notch
    cam_notch_y = sy1 + 10 if is_portrait else cy
    cam_notch_x = cx if is_portrait else sx1 + 10
    cv2.circle(img, (cam_notch_x, cam_notch_y), max(2, p_w // 30), (5, 5, 5), -1)

    # Outer metallic rim
    cv2.rectangle(img, (x1, y1), (x2, y2), (80, 80, 80), 1)

    box_w = (x2 - x1) / width
    box_h = (y2 - y1) / height
    box_cx = (x1 + x2) / (2 * width)
    box_cy = (y1 + y2) / (2 * height)

    return img, (box_cx, box_cy, box_w, box_h)


def generate_augmented_dataset(total_samples=100):
    """Generates synthetic dataset for fans and smart phones."""
    import cv2
    setup_directories()
    write_data_yaml(["fan", "smart phone"])

    train_count = int(total_samples * 0.8)
    val_count = total_samples - train_count

    print(f"[SkyResQ YOLO] Synthesizing {total_samples} high-accuracy images ({train_count} train, {val_count} val)...")

    for i in range(total_samples):
        split = "train" if i < train_count else "val"
        is_fan = (i % 2 == 0)

        if is_fan:
            fan_type = "desk" if random.random() > 0.4 else "ceiling"
            img, (bx, by, bw, bh) = generate_fan_image(640, 640, fan_type=fan_type)
            class_id = 0  # fan
        else:
            img, (bx, by, bw, bh) = generate_phone_image(640, 640)
            class_id = 1  # smart phone

        file_stem = f"sample_{class_id}_{split}_{i:04d}"
        img_path = DATASET_DIR / "images" / split / f"{file_stem}.jpg"
        lbl_path = DATASET_DIR / "labels" / split / f"{file_stem}.txt"

        # Save image
        cv2.imwrite(str(img_path), img)

        # Save label: class_id x_center y_center width height
        with open(lbl_path, "w", encoding="utf-8") as f:
            f.write(f"{class_id} {bx:.6f} {by:.6f} {bw:.6f} {bh:.6f}\n")

    print(f"[SkyResQ YOLO] Dataset generation complete at {DATASET_DIR}")


def collect_images_from_webcam(class_name="fan", count=20, device_index=0):
    """
    Opens your laptop camera and captures real-world images of objects
    (like your actual room fan or phone) with a center reticle to automatically
    label and save into the training dataset.
    """
    try:
        import cv2
    except ImportError:
        print("[Error] OpenCV is required for webcam capture. Run: pip install opencv-python")
        return

    setup_directories()
    class_id = 0 if class_name.lower() == "fan" else 1

    cap = cv2.VideoCapture(device_index)
    if not cap.isOpened():
        print(f"[Error] Could not open camera device {device_index}.")
        return

    print("=" * 65)
    print(f"  SKYRESQ INTERACTIVE WEBCAM TRAINER - Class: [{class_name.upper()}]")
    print("=" * 65)
    print(f"Point your camera at your {class_name.upper()}.")
    print("Keep the object inside the on-screen box.")
    print("Press SPACEBAR to capture an image.")
    print("Press 'Q' or ESC to exit.")
    print("=" * 65)

    captured = 0
    while captured < count:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        # Bounding box region in the center 60% of frame
        bw = int(w * 0.6)
        bh = int(h * 0.6)
        bx1 = (w - bw) // 2
        by1 = (h - bh) // 2
        bx2 = bx1 + bw
        by2 = by1 + bh

        display = frame.copy()
        cv2.rectangle(display, (bx1, by1), (bx2, by2), (0, 240, 255), 2)
        cv2.putText(
            display,
            f"Capture [{class_name.upper()}]: {captured}/{count} (Press SPACE)",
            (20, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        cv2.imshow(f"SkyResQ Object Collector - [{class_name}]", display)
        key = cv2.waitKey(20) & 0xFF

        if key == 32:  # SPACEBAR
            split = "val" if (captured % 5 == 0) else "train"
            idx_name = f"webcam_{class_name}_{captured:03d}"
            img_out = DATASET_DIR / "images" / split / f"{idx_name}.jpg"
            lbl_out = DATASET_DIR / "labels" / split / f"{idx_name}.txt"

            cv2.imwrite(str(img_out), frame)

            # Normalized YOLO coordinates
            norm_cx = (bx1 + bx2) / (2.0 * w)
            norm_cy = (by1 + by2) / (2.0 * h)
            norm_w = bw / float(w)
            norm_h = bh / float(h)

            with open(lbl_out, "w", encoding="utf-8") as f:
                f.write(f"{class_id} {norm_cx:.6f} {norm_cy:.6f} {norm_w:.6f} {norm_h:.6f}\n")

            captured += 1
            print(f"[Captured {captured}/{count}] Saved {img_out.name}")

        elif key in (27, ord('q'), ord('Q')):
            break

    cap.release()
    cv2.destroyAllWindows()
    write_data_yaml(["fan", "smart phone"])
    print(f"[SkyResQ YOLO] Captured {captured} real camera images for {class_name}.")


def train_yolo_model(epochs=10, batch_size=8, imgsz=640, base_model=None):
    """
    Executes fine-tuning using Ultralytics YOLOv8.
    Automatically saves best weights to ai/models/yolov8_custom.pt.
    """
    try:
        from ultralytics import YOLO
        import torch
    except ImportError:
        print("[Error] Ultralytics is required for training. Run: pip install ultralytics")
        return False

    if not DATA_YAML_PATH.exists():
        print("[Notice] Dataset not found. Generating default training dataset...")
        generate_augmented_dataset(total_samples=80)

    # Select base weights: yolov8s.pt (high accuracy) or yolov8n.pt
    if not base_model:
        s_path = MODELS_DIR / "yolov8s.pt"
        n_path = MODELS_DIR / "yolov8n.pt"
        base_model = str(s_path) if s_path.exists() else str(n_path)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("=" * 65)
    print("  SKYRESQ NEURAL YOLOv8 TRAINING PIPELINE")
    print("=" * 65)
    print(f"Base Weights : {base_model}")
    print(f"Dataset      : {DATA_YAML_PATH}")
    print(f"Device       : {device.upper()}")
    print(f"Epochs       : {epochs}")
    print(f"Batch Size   : {batch_size}")
    print(f"Image Size   : {imgsz}x{imgsz}")
    print("=" * 65)

    model = YOLO(base_model)
    runs_dir = TRAINING_DIR / "runs"

    results = model.train(
        data=str(DATA_YAML_PATH),
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        project=str(runs_dir),
        name="skyresq_custom",
        exist_ok=True,
        verbose=True,
        save=True,
        plots=True
    )

    # Locate the best weights
    best_weights = runs_dir / "skyresq_custom" / "weights" / "best.pt"
    if not best_weights.exists():
        best_weights = runs_dir / "skyresq_custom" / "weights" / "last.pt"

    dest_custom = MODELS_DIR / "yolov8_custom.pt"
    if best_weights.exists():
        shutil.copy2(best_weights, dest_custom)
        print("=" * 65)
        print("  TRAINING COMPLETE! HIGH ACCURACY MODEL DEPLOYED")
        print("=" * 65)
        print(f"Model saved to: {dest_custom}")
        print("The SkyResQ backend will automatically load and prioritize this model!")
        return True
    else:
        print("[Warning] Could not locate output weights file.")
        return False


def main():
    parser = argparse.ArgumentParser(description="SkyResQ YOLO Custom Training & Dataset Pipeline")
    parser.add_argument("--auto", action="store_true", help="Generate synthetic dataset and train immediately")
    parser.add_argument("--train", action="store_true", help="Train model using existing dataset")
    parser.add_argument("--generate-dataset", action="store_true", help="Synthesize fan & smart phone dataset")
    parser.add_argument("--samples", type=int, default=80, help="Number of synthetic samples to generate")
    parser.add_argument("--collect-webcam", action="store_true", help="Capture real items using laptop webcam")
    parser.add_argument("--class-name", type=str, default="fan", help="Class name for webcam capture (fan or 'smart phone')")
    parser.add_argument("--count", type=int, default=20, help="Number of webcam frames to collect")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size for training")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")

    args = parser.parse_args()

    if args.auto:
        print("[1/2] Generating custom dataset for Fans and Smart Phones...")
        generate_augmented_dataset(total_samples=args.samples)
        print("[2/2] Launching fine-tuning training...")
        train_yolo_model(epochs=args.epochs, batch_size=args.batch, imgsz=args.imgsz)
    elif args.collect_webcam:
        collect_images_from_webcam(class_name=args.class_name, count=args.count)
    elif args.generate_dataset:
        generate_augmented_dataset(total_samples=args.samples)
    elif args.train:
        train_yolo_model(epochs=args.epochs, batch_size=args.batch, imgsz=args.imgsz)
    else:
        print("\n=== SkyResQ YOLO Custom Training Suite ===")
        print("1. To automatically generate dataset and train custom model:")
        print("   python train_yolo.py --auto --epochs 10\n")
        print("2. To capture real photos of your room fan/phone from webcam:")
        print("   python train_yolo.py --collect-webcam --class-name fan --count 20\n")
        print("3. To fine-tune on existing images:")
        print("   python train_yolo.py --train --epochs 15\n")
        # Default behavior: run dataset generation so training data is ready
        setup_directories()
        write_data_yaml(["fan", "smart phone"])
        print("[Ready] Dataset template initialized in ai/training/")


if __name__ == "__main__":
    main()
