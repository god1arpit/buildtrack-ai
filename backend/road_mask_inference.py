"""Run the standalone trained road-surface segmentation checkpoint."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
import segmentation_models_pytorch as smp
import torch


ROAD_CONFIDENCE_THRESHOLD = 0.55


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, required=True)
    args = parser.parse_args()

    image = cv2.imread(str(args.image), cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit("The uploaded image could not be decoded.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    torch.set_num_threads(min(6, torch.get_num_threads()))
    checkpoint = torch.load(args.checkpoint, map_location=device, weights_only=False)
    model = smp.Unet(
        encoder_name="resnet18",
        encoder_weights=None,
        in_channels=3,
        classes=1,
        activation=None,
    ).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    rgb = cv2.cvtColor(cv2.resize(image, (320, 320), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    normalized = (rgb.astype(np.float32) / 255.0 - mean) / std
    tensor = torch.from_numpy(np.ascontiguousarray(normalized.transpose(2, 0, 1))).unsqueeze(0).to(device)

    with torch.inference_mode():
        probabilities = torch.sigmoid(model(tensor))[0, 0].cpu().numpy()
    mask = cv2.resize(probabilities, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_LINEAR) >= ROAD_CONFIDENCE_THRESHOLD

    overlay = image.copy()
    tint = np.zeros_like(image)
    tint[:] = (46, 204, 113)
    overlay[mask] = cv2.addWeighted(image, 0.58, tint, 0.42, 0)[mask]
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(overlay, contours, -1, (80, 255, 160), max(2, image.shape[1] // 700), cv2.LINE_AA)

    banner = overlay.copy()
    cv2.rectangle(banner, (12, 12), (min(image.shape[1] - 12, 720), 94), (15, 23, 42), -1)
    cv2.addWeighted(banner, 0.84, overlay, 0.16, 0, overlay)
    cv2.putText(overlay, "ROAD SURFACE MODEL PREVIEW", (26, 43), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 190, 40), 2, cv2.LINE_AA)
    cv2.putText(overlay, "Detected road area in this frame; not project completion", (26, 74), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (240, 245, 255), 1, cv2.LINE_AA)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(args.output), overlay):
        raise SystemExit("Could not save the road-mask preview.")

    print(json.dumps({
        "road_coverage_pct": round(float(mask.mean() * 100), 1),
        "model_checkpoint": args.checkpoint.name,
        "threshold": ROAD_CONFIDENCE_THRESHOLD,
    }))


if __name__ == "__main__":
    main()
