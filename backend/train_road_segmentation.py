"""Train a binary road-surface segmentation pilot on ROADWork, IDD, or Mapillary labels.

For this binary target, ID 1 is road and all other pixels are background.
This script learns a visible road mask only; it does not estimate project
completion percentage.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import cv2
import numpy as np
import segmentation_models_pytorch as smp
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from tqdm import tqdm


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_ROOT = PROJECT_ROOT / "data" / "roadwork" / "scene"
DEFAULT_OUTPUT = PROJECT_ROOT / "backend" / "models" / "road_boundary_best.pth"
ROAD_LABEL_ID = 1
MAPILLARY_ROAD_LABEL_IDS = {21, 23}  # Road and service lane in Mapillary Vistas v2.0.
IGNORE_LABEL_ID = 255
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class RoadMaskDataset(Dataset):
    def __init__(self, data_root: Path, split: str, size: int, limit: int, seed: int, augment: bool, local_data_root: Path | None = None):
        self.data_root = data_root
        self.size = size
        self.augment = augment
        pairs: list[tuple[Path, Path, str]] = []
        idd_image_dir = data_root / "leftImg8bit" / split
        local_image_dir = data_root / "images" / split
        local_mask_dir = data_root / "masks" / split
        mapillary_split = "training" if split == "train" else "validation"
        mapillary_image_dir = data_root / mapillary_split / "images"
        mapillary_label_dir = data_root / mapillary_split / "v2.0" / "labels"
        if idd_image_dir.is_dir():
            mask_dir = data_root / "road_masks" / split
            for image_path in sorted(idd_image_dir.rglob("*_leftImg8bit.jpg")):
                base_name = image_path.stem.removesuffix("_leftImg8bit")
                mask_path = mask_dir / image_path.parent.name / f"{base_name}_road.png"
                if mask_path.is_file():
                    pairs.append((image_path, mask_path, "idd"))
        elif local_image_dir.is_dir() and local_mask_dir.is_dir():
            for image_path in sorted(local_image_dir.glob("*")):
                if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                    continue
                mask_path = local_mask_dir / f"{image_path.stem}_road.png"
                if mask_path.is_file():
                    pairs.append((image_path, mask_path, "local"))
        elif mapillary_image_dir.is_dir() and mapillary_label_dir.is_dir():
            for image_path in sorted(mapillary_image_dir.glob("*.jpg")):
                mask_path = mapillary_label_dir / f"{image_path.stem}.png"
                if mask_path.is_file():
                    pairs.append((image_path, mask_path, "mapillary"))
        else:
            mask_dir = data_root / "sem_seg" / "gtFine" / split
            image_dirs = [
                data_root / "images",
                data_root / "sem_seg" / "images" / split,
            ]
            if not mask_dir.is_dir():
                raise FileNotFoundError(f"Road mask split not found: {mask_dir}")
            for mask_path in sorted(mask_dir.glob("*_labelIds.png")):
                base_name = mask_path.name.removesuffix("_labelIds.png")
                image_path = next(
                    (directory / f"{base_name}.jpg" for directory in image_dirs if (directory / f"{base_name}.jpg").is_file()),
                    None,
                )
                if image_path is not None:
                    pairs.append((image_path, mask_path, "roadwork"))

        if not pairs:
            raise RuntimeError(
                f"No image/mask pairs found for {split}. Expected JPG files under "
                f"matching image and road mask files for split {split} under {data_root}."
            )
        if limit > 0 and len(pairs) > limit:
            pairs = random.Random(seed).sample(pairs, limit)
        # Keep manually traced local roads in every sampled training split so
        # scarce project-specific labels are not lost during random sampling.
        if local_data_root is not None and split == "train":
            local_images = local_data_root / "images" / "train"
            local_masks = local_data_root / "masks" / "train"
            for image_path in sorted(local_images.glob("*")):
                mask_path = local_masks / f"{image_path.stem}_road.png"
                if image_path.is_file() and mask_path.is_file():
                    pairs.append((image_path, mask_path, "local"))
        self.pairs = pairs

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, index: int):
        image_path, mask_path, label_format = self.pairs[index]
        image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if label_format == "mapillary":
            # Mapillary labels are palette PNGs; PIL preserves the encoded class IDs.
            with Image.open(mask_path) as label_image:
                label = np.asarray(label_image)
        else:
            label = cv2.imread(str(mask_path), cv2.IMREAD_UNCHANGED)
        if image is None or label is None or label.ndim != 2:
            raise RuntimeError(f"Could not read image/mask pair: {image_path.name}")

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, (self.size, self.size), interpolation=cv2.INTER_AREA)
        label = cv2.resize(label, (self.size, self.size), interpolation=cv2.INTER_NEAREST)
        if label_format == "local":
            road = (label > 0).astype(np.float32)
        elif (self.data_root / "config_v2.0.json").is_file():
            road = np.isin(label, tuple(MAPILLARY_ROAD_LABEL_IDS)).astype(np.float32)
        else:
            road = (label == ROAD_LABEL_ID).astype(np.float32)
        # ROADWork marks many non-road scene pixels as void in its task-specific
        # masks. They must count as background for a whole-image road mask, or
        # predictions in sky/buildings are unconstrained.
        valid = np.ones_like(road, dtype=np.float32)

        if self.augment and random.random() < 0.5:
            image = np.ascontiguousarray(image[:, ::-1])
            road = np.ascontiguousarray(road[:, ::-1])
            valid = np.ascontiguousarray(valid[:, ::-1])

        image = image.astype(np.float32) / 255.0
        image = (image - MEAN) / STD
        image = torch.from_numpy(np.ascontiguousarray(image.transpose(2, 0, 1)))
        road = torch.from_numpy(road[None, :, :])
        valid = torch.from_numpy(valid[None, :, :])
        return image, road, valid


def masked_bce_loss(logits: torch.Tensor, target: torch.Tensor, valid: torch.Tensor) -> torch.Tensor:
    pixel_loss = nn.functional.binary_cross_entropy_with_logits(logits, target, reduction="none")
    return (pixel_loss * valid).sum() / valid.sum().clamp_min(1.0)


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[float, float]:
    model.eval()
    total_loss = 0.0
    intersection = 0.0
    union = 0.0
    count = 0
    for images, roads, valid in tqdm(loader, desc="validation", leave=False):
        images, roads, valid = images.to(device), roads.to(device), valid.to(device)
        logits = model(images)
        loss = masked_bce_loss(logits, roads, valid)
        prediction = (torch.sigmoid(logits) >= 0.5).float()
        intersection += ((prediction * roads) * valid).sum().item()
        union += (((prediction + roads) > 0).float() * valid).sum().item()
        total_loss += loss.item()
        count += 1
    return total_loss / max(count, 1), intersection / max(union, 1.0)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, default=DEFAULT_DATA_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--image-size", type=int, default=320)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--max-train", type=int, default=256, help="0 uses every image in the train split")
    parser.add_argument("--max-val", type=int, default=64, help="0 uses every image in the validation split")
    parser.add_argument("--workers", type=int, default=0, help="0 is safest on Windows")
    parser.add_argument("--seed", type=int, default=41)
    parser.add_argument("--resume", type=Path, help="initialize from a saved checkpoint")
    parser.add_argument("--local-data-root", type=Path, help="optional local road masks to include in training")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(min(6, torch.get_num_threads()))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    is_idd = (args.data_root / "leftImg8bit").is_dir()
    is_mapillary = (args.data_root / "config_v2.0.json").is_file()
    is_local = (args.data_root / "images").is_dir() and (args.data_root / "masks").is_dir()
    source_dataset = "IDD Segmentation" if is_idd else "Mapillary Vistas v2.0" if is_mapillary else "Manually labeled local roads" if is_local else "ROADWork"
    source_road_labels = (
        ["road", "drivable fallback"] if is_idd else
        ["road", "service lane"] if is_mapillary else
        ["manually traced road surface"] if is_local else
        ["ROADWork road label"]
    )

    train_data = RoadMaskDataset(args.data_root, "train", args.image_size, args.max_train, args.seed, True, args.local_data_root)
    val_data = RoadMaskDataset(args.data_root, "val", args.image_size, args.max_val, args.seed + 1, False)
    train_loader = DataLoader(train_data, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_loader = DataLoader(val_data, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)

    model = smp.Unet(
        encoder_name="resnet18",
        encoder_weights=None,
        in_channels=3,
        classes=1,
        activation=None,
    ).to(device)
    if args.resume:
        checkpoint = torch.load(args.resume, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        print(f"Initialized from checkpoint: {args.resume}")
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)

    print(f"Device: {device}; train pairs: {len(train_data)}; validation pairs: {len(val_data)}")
    print(f"Source dataset: {source_dataset}; road labels: {', '.join(source_road_labels)}")
    print("Training target: binary road mask (pixel value 1; all other pixels are background).")
    best_iou = -1.0
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        for images, roads, valid in tqdm(train_loader, desc=f"epoch {epoch}/{args.epochs}"):
            images, roads, valid = images.to(device), roads.to(device), valid.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = masked_bce_loss(model(images), roads, valid)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        train_loss = running_loss / max(len(train_loader), 1)
        val_loss, val_iou = evaluate(model, val_loader, device)
        record = {"epoch": epoch, "train_loss": train_loss, "val_loss": val_loss, "road_iou": val_iou}
        history.append(record)
        print(json.dumps(record))

        if val_iou > best_iou:
            best_iou = val_iou
            args.output.parent.mkdir(parents=True, exist_ok=True)
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "architecture": "smp.Unet(resnet18)",
                    "source_dataset": source_dataset,
                    "source_road_labels": source_road_labels,
                    "road_label_id": sorted(MAPILLARY_ROAD_LABEL_IDS) if is_mapillary else ROAD_LABEL_ID,
                    "source_void_label_id": None if is_idd else IGNORE_LABEL_ID,
                    "void_treated_as_background": True,
                    "image_size": args.image_size,
                    "mean": MEAN.tolist(),
                    "std": STD.tolist(),
                    "best_road_iou": best_iou,
                    "history": history,
                },
                args.output,
            )

    history_path = args.output.with_suffix(".history.json")
    history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")
    print(f"Best checkpoint: {args.output}")
    print(f"Best validation road IoU: {best_iou:.4f}")
    print(f"Training history: {history_path}")


if __name__ == "__main__":
    main()
