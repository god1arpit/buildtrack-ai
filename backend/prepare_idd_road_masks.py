"""Rasterize IDD polygon annotations into binary road masks."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[1]
IDD_ROOT = PROJECT_ROOT / "data" / "idd20kII" / "idd20kII"
ROAD_LABELS = {"road", "drivable fallback"}


def main() -> None:
    total = 0
    for split in ("train", "val"):
        annotation_root = IDD_ROOT / "gtFine" / split
        image_root = IDD_ROOT / "leftImg8bit" / split
        output_root = IDD_ROOT / "road_masks" / split
        annotations = sorted(annotation_root.rglob("*_gtFine_polygons.json"))
        if not annotations:
            raise FileNotFoundError(f"IDD annotations not found: {annotation_root}")

        count = 0
        for annotation_path in annotations:
            base_name = annotation_path.name.removesuffix("_gtFine_polygons.json")
            sequence = annotation_path.parent.name
            image_path = image_root / sequence / f"{base_name}_leftImg8bit.jpg"
            if not image_path.is_file():
                continue

            data = json.loads(annotation_path.read_text(encoding="utf-8"))
            height = int(data["imgHeight"])
            width = int(data["imgWidth"])
            mask = np.zeros((height, width), dtype=np.uint8)
            for obj in data.get("objects", []):
                if obj.get("deleted", 0) or not obj.get("draw", True):
                    continue
                if obj.get("label", "").strip().lower() not in ROAD_LABELS:
                    continue
                polygon = np.asarray(obj.get("polygon", []), dtype=np.float32)
                if polygon.ndim != 2 or len(polygon) < 3:
                    continue
                polygon = np.rint(polygon).astype(np.int32)
                cv2.fillPoly(mask, [polygon], color=1)

            destination = output_root / sequence / f"{base_name}_road.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            if not cv2.imwrite(str(destination), mask):
                raise OSError(f"Could not write IDD mask: {destination}")
            count += 1
            if count % 1000 == 0:
                print(f"{split}: rasterized {count}/{len(annotations)}", flush=True)

        print(f"{split}: wrote {count} road masks", flush=True)
        total += count

    print(f"Total IDD road masks: {total}", flush=True)


if __name__ == "__main__":
    main()
