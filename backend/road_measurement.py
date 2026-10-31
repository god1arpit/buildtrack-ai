"""
Road Construction Measurement Engine
Computes real-world physical dimensions (Length, Width, Area, Chainage)
and differentiates Completed Paved Surface vs Under Construction Sections.
"""

from __future__ import annotations
import cv2
import numpy as np
from typing import Dict, Any, Tuple, List


def estimate_pixel_scale(
    mask: np.ndarray,
    known_road_width_m: float = 7.0,
    gsd_m_per_px: float | None = None
) -> Tuple[float, float]:
    """
    Determine meters_per_pixel scale.
    If gsd_m_per_px is provided, use it directly.
    Otherwise, estimate from mean cross-sectional width of the segmented road mask.
    """
    if gsd_m_per_px is not None and gsd_m_per_px > 0:
        return gsd_m_per_px, gsd_m_per_px * 100.0  # (m/px, cm/px)

    h, w = mask.shape[:2]
    binary = (mask > 0).astype(np.uint8)
    y_coords, x_coords = np.where(binary > 0)
    if len(y_coords) < 10:
        return 0.05, 5.0

    y_min, y_max = int(np.min(y_coords)), int(np.max(y_coords))
    span_y = y_max - y_min

    # Sample rows across the active road region to estimate mean pixel width
    row_widths = []
    y_start = int(y_min + span_y * 0.15)
    y_end = int(y_max - span_y * 0.10)
    y_step = max(2, (y_end - y_start) // 15)

    for y in range(y_start, y_end, y_step):
        nz = np.where(binary[y, :] > 0)[0]
        if len(nz) > 10:
            row_widths.append(nz[-1] - nz[0])

    if not row_widths:
        row_widths = [max(30, int(w * 0.35))]

    mean_width_px = float(np.median(row_widths))
    m_per_px = known_road_width_m / max(mean_width_px, 1.0)
    m_per_px = float(np.clip(m_per_px, 0.005, 0.50))
    return m_per_px, m_per_px * 100.0


def extract_road_centerline(mask: np.ndarray) -> List[Tuple[int, int]]:
    """
    Extract smoothed centerline points along the principal road axis.
    In road perspective views, the road extends from near camera (bottom of image)
    towards the horizon/vanishing point (top of road mask).
    """
    h, w = mask.shape[:2]
    binary = (mask > 0).astype(np.uint8)

    y_coords, x_coords = np.where(binary > 0)
    if len(y_coords) < 10:
        return [(w // 2, int(h * 0.85)), (w // 2, int(h * 0.35))]

    y_min, y_max = int(np.min(y_coords)), int(np.max(y_coords))
    x_min, x_max = int(np.min(x_coords)), int(np.max(x_coords))

    span_y = y_max - y_min
    span_x = x_max - x_min

    # Ground perspective street & highway views travel longitudinally (along Y).
    # Only pure top-down orthogonal perpendicular crossings are horizontal.
    is_vertical = not (span_x > 3.0 * span_y and y_max < h * 0.65)

    centerline: List[Tuple[int, int]] = []
    num_samples = 35

    if is_vertical:
        # Traverse from bottom of road (near camera) towards the top (horizon)
        step = max(2, span_y // num_samples)
        for y in range(y_max, y_min, -step):
            row = binary[y, :]
            nz = np.where(row > 0)[0]
            if len(nz) > 0:
                center_x = int(np.mean(nz))
                centerline.append((center_x, y))
    else:
        # For aerial top-down perpendicular crossing roads
        step = max(2, span_x // num_samples)
        for x in range(x_min, x_max, step):
            col = binary[:, x]
            nz = np.where(col > 0)[0]
            if len(nz) > 0:
                center_y = int(np.mean(nz))
                centerline.append((x, center_y))

    if len(centerline) < 2:
        return [(w // 2, int(h * 0.85)), (w // 2, int(h * 0.35))]

    # Moving average smoothing
    smoothed = []
    window = 3
    for i in range(len(centerline)):
        start = max(0, i - window)
        end = min(len(centerline), i + window + 1)
        sub = centerline[start:end]
        avg_x = int(np.mean([pt[0] for pt in sub]))
        avg_y = int(np.mean([pt[1] for pt in sub]))
        smoothed.append((avg_x, avg_y))

    return smoothed


def classify_road_surface(
    image: np.ndarray,
    mask: np.ndarray,
    centerline: List[Tuple[int, int]]
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Differentiate Completed Paved Surface (Asphalt or Paver Blocks) vs Under Construction Earthwork.
    - Paved concrete blocks / asphalt have low saturation or uniform grey/stone tone.
    - True under construction earthwork/subgrade has distinct brown/yellow soil saturation and rough gravel texture.
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    road_mask = (mask > 0)
    if not np.any(road_mask):
        return mask.copy(), np.zeros_like(mask), 0.0

    # Soil / unpaved earth has distinct warm soil hue (8 to 32) with moderate-to-high saturation (>60)
    # Paved asphalt and concrete interlocking blocks have low saturation (<55) or neutral tone
    hue = hsv[:, :, 0]
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]

    # Detect genuine raw earth/gravel patches
    is_soil_unpaved = (hue >= 8) & (hue <= 34) & (sat > 60) & (val > 65) & road_mask

    # Morphological opening removes brick grooves and small texture noise
    clean_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
    under_const_clean = cv2.morphologyEx(is_soil_unpaved.astype(np.uint8), cv2.MORPH_OPEN, clean_kernel)

    # Completed paved surface is everything else on the road mask
    is_paved = road_mask & (under_const_clean == 0)

    paved_mask = is_paved.astype(np.uint8)
    under_const_mask = (road_mask & (under_const_clean > 0)).astype(np.uint8)

    total_road_px = np.count_nonzero(road_mask)
    under_const_px = np.count_nonzero(under_const_mask)
    under_const_ratio = float(under_const_px / max(total_road_px, 1))

    return paved_mask, under_const_mask, under_const_ratio


def measure_road_and_annotate(
    image: np.ndarray,
    mask: np.ndarray,
    known_road_width_m: float = 7.0,
    gsd_m_per_px: float | None = None
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Perform complete geometric measurement of the road:
    - Centerline distance (Length in meters / km)
    - Cross-section width profile (Average, Min, Max width in meters)
    - Surface area in square meters
    - Under-construction vs completed breakdown
    - Chainage annotations (Ch 0+000, Ch 0+050, etc.)
    - Render measurement dimension lines & engineering HUD
    """
    h, w = image.shape[:2]
    annotated = image.copy()
    overlay = image.copy()

    # 1. Scale Calibration
    m_per_px, gsd_cm = estimate_pixel_scale(mask, known_road_width_m, gsd_m_per_px)

    # 2. Extract Centerline
    centerline = extract_road_centerline(mask)

    # 3. Surface Classification (Paved vs Under Construction)
    paved_mask, under_const_mask, under_const_ratio = classify_road_surface(image, mask, centerline)

    # 4. Compute Cumulative Length along Centerline
    seg_lengths_px = []
    cum_dist_px = [0.0]
    for i in range(1, len(centerline)):
        pt1 = centerline[i - 1]
        pt2 = centerline[i]
        d = float(np.hypot(pt2[0] - pt1[0], pt2[1] - pt1[1]))
        seg_lengths_px.append(d)
        cum_dist_px.append(cum_dist_px[-1] + d)

    total_length_px = cum_dist_px[-1] if cum_dist_px else 0.0
    total_length_m = round(float(total_length_px * m_per_px), 1)
    total_length_km = round(total_length_m / 1000.0, 3)

    # 5. Measure Width along Cross-Sections
    measured_widths_m = []
    width_callouts = []
    sample_indices = [
        int(len(centerline) * 0.20),
        int(len(centerline) * 0.50),
        int(len(centerline) * 0.80)
    ]

    binary_mask = (mask > 0).astype(np.uint8)
    y_coords, x_coords = np.where(binary_mask > 0)
    span_y = int(np.max(y_coords)) - int(np.min(y_coords)) if len(y_coords) > 0 else h
    span_x = int(np.max(x_coords)) - int(np.min(x_coords)) if len(x_coords) > 0 else w
    is_vertical_corridor = not (span_x > 3.0 * span_y and int(np.max(y_coords)) < h * 0.65)

    for idx, (cx, cy) in enumerate(centerline):
        if is_vertical_corridor:
            row = binary_mask[cy, :]
            nz = np.where(row > 0)[0]
            if len(nz) > 5:
                x_left = int(np.min(nz))
                x_right = int(np.max(nz))
                width_px = x_right - x_left
                width_m = round(width_px * m_per_px, 1)
                measured_widths_m.append(width_m)
                if idx in sample_indices:
                    width_callouts.append(((x_left, cy), (x_right, cy), width_m))
        else:
            col = binary_mask[:, cx]
            nz = np.where(col > 0)[0]
            if len(nz) > 5:
                y_top = int(np.min(nz))
                y_bottom = int(np.max(nz))
                width_px = y_bottom - y_top
                width_m = round(width_px * m_per_px, 1)
                measured_widths_m.append(width_m)
                if idx in sample_indices:
                    width_callouts.append(((cx, y_top), (cx, y_bottom), width_m))

    if not measured_widths_m:
        measured_widths_m = [known_road_width_m]

    avg_width_m = round(float(np.mean(measured_widths_m)), 1)
    min_width_m = round(float(np.min(measured_widths_m)), 1)
    max_width_m = round(float(np.max(measured_widths_m)), 1)

    # 6. Surface Area Calculation
    total_road_px = int(np.count_nonzero(mask > 0))
    total_area_sqm = round(float(total_road_px * (m_per_px ** 2)), 1)

    under_const_m = round(total_length_m * under_const_ratio, 1)
    completed_m = round(total_length_m - under_const_m, 1)
    under_const_pct = round(under_const_ratio * 100.0, 1)
    completed_pct = round(100.0 - under_const_pct, 1)

    under_const_area_sqm = round(total_area_sqm * under_const_ratio, 1)
    completed_area_sqm = round(total_area_sqm - under_const_area_sqm, 1)

    # 7. Render Color Segmentations & Dimension Lines
    # Paved = Emerald Green (46, 204, 113), Under Construction = Amber/Orange (241, 156, 18)
    overlay[paved_mask > 0] = (46, 204, 113)
    overlay[under_const_mask > 0] = (30, 140, 245)  # Amber-Orange in BGR

    cv2.addWeighted(overlay, 0.40, annotated, 0.60, 0, annotated)

    # Draw Road Boundary Contours
    contours, _ = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(annotated, contours, -1, (255, 255, 255), 2, cv2.LINE_AA)

    # Draw Centerline with Chainage Markers
    for i in range(1, len(centerline)):
        cv2.line(annotated, centerline[i - 1], centerline[i], (0, 240, 255), 3, cv2.LINE_AA)

    # Chainage station markers every ~50m or at quarter marks
    dist_interval_m = max(25.0, total_length_m / 4.0)
    next_mark_m = 0.0

    for i, (cx, cy) in enumerate(centerline):
        cur_m = cum_dist_px[i] * m_per_px
        if cur_m >= next_mark_m or i == len(centerline) - 1:
            ch_str = f"Ch 0+{int(cur_m):03d}"
            # Station circle
            cv2.circle(annotated, (cx, cy), 6, (0, 240, 255), -1, cv2.LINE_AA)
            cv2.circle(annotated, (cx, cy), 8, (15, 23, 42), 2, cv2.LINE_AA)
            # Label
            cv2.putText(
                annotated,
                ch_str,
                (cx + 12, cy + 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.48,
                (15, 23, 42),
                3,
                cv2.LINE_AA
            )
            cv2.putText(
                annotated,
                ch_str,
                (cx + 12, cy + 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.48,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )
            next_mark_m += dist_interval_m

    # Draw Cross-Section Width Dimension Lines with arrows
    for p_left, p_right, w_val in width_callouts:
        cv2.line(annotated, p_left, p_right, (0, 0, 255), 2, cv2.LINE_AA)
        cv2.circle(annotated, p_left, 4, (0, 0, 255), -1, cv2.LINE_AA)
        cv2.circle(annotated, p_right, 4, (0, 0, 255), -1, cv2.LINE_AA)

        mid_x = (p_left[0] + p_right[0]) // 2
        mid_y = (p_left[1] + p_right[1]) // 2
        w_text = f"W: {w_val}m"
        cv2.putText(annotated, w_text, (mid_x - 20, mid_y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (15, 23, 42), 3, cv2.LINE_AA)
        cv2.putText(annotated, w_text, (mid_x - 20, mid_y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1, cv2.LINE_AA)

    # 8. Render Engineering Measurement HUD Panel (Top Banner)
    banner_h = 100
    banner_w = min(w - 20, 780)
    banner_rect = np.array([
        [10, 10],
        [banner_w, 10],
        [banner_w, banner_h],
        [10, banner_h]
    ], np.int32)

    hud_overlay = annotated.copy()
    cv2.fillPoly(hud_overlay, [banner_rect], (15, 23, 42))
    cv2.addWeighted(hud_overlay, 0.88, annotated, 0.12, 0, annotated)
    cv2.polylines(annotated, [banner_rect], True, (245, 158, 11), 1, cv2.LINE_AA)

    # Header title
    cv2.putText(
        annotated,
        "BUILDTRACK ROAD CONSTRUCTION MEASUREMENT HUD",
        (22, 32),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (245, 158, 11),
        2,
        cv2.LINE_AA
    )

    # Primary Row: Length, Width, Area
    row1 = f"TOTAL LENGTH: {total_length_m:.1f} m ({total_length_km:.3f} km)  |  AVG WIDTH: {avg_width_m:.1f} m  |  AREA: {total_area_sqm:,.0f} sq.m"
    cv2.putText(annotated, row1, (22, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 255, 255), 1, cv2.LINE_AA)

    # Secondary Row: Under Construction vs Completed
    row2 = f"UNDER CONSTRUCTION: {under_const_m:.1f} m ({under_const_pct:.1f}%)  |  COMPLETED: {completed_m:.1f} m ({completed_pct:.1f}%)"
    cv2.putText(annotated, row2, (22, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (80, 220, 255), 1, cv2.LINE_AA)

    measurements: Dict[str, Any] = {
        "total_length_m": total_length_m,
        "total_length_km": total_length_km,
        "avg_width_m": avg_width_m,
        "min_width_m": min_width_m,
        "max_width_m": max_width_m,
        "total_area_sqm": total_area_sqm,
        "completed_length_m": completed_m,
        "completed_pct": completed_pct,
        "completed_area_sqm": completed_area_sqm,
        "under_construction_length_m": under_const_m,
        "under_construction_pct": under_const_pct,
        "under_construction_area_sqm": under_const_area_sqm,
        "gsd_cm_per_px": round(gsd_cm, 2),
        "chainage_start": "Ch 0+000",
        "chainage_end": f"Ch 0+{int(total_length_m):03d}",
        "calibrated_road_width_m": known_road_width_m,
    }

    return annotated, measurements
