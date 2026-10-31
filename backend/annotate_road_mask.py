"""Trace road-surface polygons and save binary masks for local fine-tuning.

Controls: left click adds polygon points; Enter closes a polygon; Backspace
undoes the last point; C clears the current image; S saves; Q exits.
Use Shift+left-click to start a polygon that removes an island (for example,
a large obstacle that should not be included in the road surface).
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--images", type=Path, default=Path("data/local_road_annotations/images/train"))
    parser.add_argument("--masks", type=Path, default=Path("data/local_road_annotations/masks/train"))
    parser.add_argument("--pattern", default="*", help="Image filename glob, default: all images")
    args = parser.parse_args()

    images = sorted(
        p for p in args.images.glob(args.pattern)
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
        and not (args.masks / f"{p.stem}_road.png").is_file()
    )
    if not images:
        raise SystemExit(f"No images found in {args.images} matching {args.pattern!r}")

    args.masks.mkdir(parents=True, exist_ok=True)
    index = 0
    while index < len(images):
        image_path = images[index]
        image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if image is None:
            print(f"Skipping unreadable image: {image_path}")
            index += 1
            continue

        original_h, original_w = image.shape[:2]
        scale = min(1.0, 1400 / original_w, 850 / original_h)
        display = cv2.resize(image, (round(original_w * scale), round(original_h * scale))) if scale < 1 else image.copy()
        mask = np.zeros((original_h, original_w), dtype=np.uint8)
        polygons: list[tuple[np.ndarray, bool]] = []
        points: list[tuple[int, int]] = []
        subtract = False
        window = "Trace road mask | Enter close | S save | N next | Q quit"

        def render() -> np.ndarray:
            preview = display.copy()
            scaled_mask = cv2.resize(mask, (display.shape[1], display.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
            tint = preview.copy()
            tint[scaled_mask] = (40, 220, 150)
            preview = cv2.addWeighted(tint, 0.42, preview, 0.58, 0)
            for polygon, is_subtract in polygons:
                pts = np.round(polygon.astype(np.float32) * scale).astype(np.int32)
                cv2.polylines(preview, [pts], True, (0, 0, 255) if is_subtract else (0, 255, 255), 2)
            if points:
                pts = np.array(points, dtype=np.int32)
                cv2.polylines(preview, [pts], False, (0, 165, 255), 2)
                for x, y in points:
                    cv2.circle(preview, (x, y), 4, (0, 165, 255), -1)
            label = f"{index + 1}/{len(images)} {image_path.name} | polygons: {len(polygons)}"
            cv2.putText(preview, label[:100], (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
            return preview

        def mouse(event: int, x: int, y: int, flags: int, _param: object) -> None:
            nonlocal subtract
            if event == cv2.EVENT_LBUTTONDOWN:
                points.append((x, y))
                subtract = bool(flags & cv2.EVENT_FLAG_SHIFTKEY)

        cv2.namedWindow(window, cv2.WINDOW_NORMAL)
        cv2.setMouseCallback(window, mouse)
        print(f"Tracing {image_path}; finish road polygons with Enter, then S to save.")
        while True:
            cv2.imshow(window, render())
            key = cv2.waitKey(20) & 0xFF
            if key in (10, 13) and len(points) >= 3:
                original_points = np.round(np.asarray(points, dtype=np.float32) / scale).astype(np.int32)
                polygon = original_points.reshape((-1, 1, 2))
                if subtract:
                    cv2.fillPoly(mask, [polygon], 0)
                else:
                    cv2.fillPoly(mask, [polygon], 1)
                polygons.append((original_points, subtract))
                points.clear()
            elif key in (8, 127) and points:
                points.pop()
            elif key in (ord("c"), ord("C")):
                mask.fill(0)
                polygons.clear()
                points.clear()
            elif key in (ord("s"), ord("S")):
                if not mask.any():
                    print("No road area traced yet. Click boundary points, press Enter, then S to save.")
                    continue
                output = args.masks / f"{image_path.stem}_road.png"
                cv2.imwrite(str(output), mask * 255)
                print(f"Saved {output} ({int(mask.sum())} road pixels)")
                break
            elif key in (ord("n"), ord("N")):
                break
            elif key in (ord("q"), ord("Q"), 27):
                cv2.destroyAllWindows()
                return
        cv2.destroyWindow(window)
        index += 1

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
