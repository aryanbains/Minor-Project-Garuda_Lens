from __future__ import annotations

import base64
import hashlib
import io
from datetime import date, datetime
from typing import Any, Dict, Optional

import numpy as np
from PIL import Image, ImageColor, ImageDraw, ImageFont
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from garuda_store import load_location_presets


FOOTBALL_FIELD_SQ_M = 7140
COLOR_MAP = {
    "urban_construction": "#8b5a3c",
    "vegetation_loss": "#41a85f",
    "water_body_change": "#2e6fd8",
    "bare_land_exposure": "#f0ede5",
}
DISPLAY_LABELS = {
    "urban_construction": "Urban construction",
    "vegetation_loss": "Vegetation loss",
    "water_body_change": "Water body change",
    "bare_land_exposure": "Bare land exposure",
}


def list_location_presets() -> list[dict[str, Any]]:
    return load_location_presets()


def find_location_preset(preset_id: str) -> Optional[dict[str, Any]]:
    return next((preset for preset in list_location_presets() if preset["id"] == preset_id), None)


def area_sq_km_from_pixels(changed_pixels: int, resolution_m: float) -> float:
    return round((changed_pixels * (resolution_m**2)) / 1_000_000, 3)


def football_fields_from_sq_km(area_sq_km: float) -> int:
    return max(1, round((area_sq_km * 1_000_000) / FOOTBALL_FIELD_SQ_M)) if area_sq_km > 0 else 0


def severity_from_percentage(change_percentage: float) -> str:
    if change_percentage >= 18:
        return "Extreme"
    if change_percentage >= 10:
        return "High"
    if change_percentage >= 4:
        return "Moderate"
    return "Low"


def estimate_credit_cost(demo_mode: bool, timeline_frames: int = 0) -> float:
    if demo_mode:
        return 0.0
    return round(2.2 + (timeline_frames * 0.7), 2)


def iso_today() -> str:
    return date.today().isoformat()


def encode_image(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def decode_image(encoded: str) -> Image.Image:
    payload = encoded.split(",", 1)[1] if "," in encoded else encoded
    return Image.open(io.BytesIO(base64.b64decode(payload))).convert("RGB")


def _seed_for(*parts: str) -> int:
    digest = hashlib.sha256(":".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _blank_canvas(width: int = 420, height: int = 320) -> np.ndarray:
    canvas_arr = np.zeros((height, width, 3), dtype=np.uint8)
    canvas_arr[:, :] = np.array([78, 108, 76], dtype=np.uint8)
    return canvas_arr


def _apply_linear_gradient(image: np.ndarray, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> np.ndarray:
    height = image.shape[0]
    for row in range(height):
        alpha = row / max(height - 1, 1)
        image[row, :] = (np.array(top) * (1 - alpha) + np.array(bottom) * alpha).astype(np.uint8)
    return image


def _draw_demo_map(preset_id: str, location_name: str, before_date: str, after_date: str) -> dict[str, Any]:
    seed = _seed_for(preset_id or location_name, before_date, after_date)
    rng = np.random.default_rng(seed)
    width, height = 420, 320
    yy, xx = np.mgrid[0:height, 0:width]

    before = _blank_canvas(width, height)
    before = _apply_linear_gradient(before, (88, 126, 84), (163, 144, 104))

    river_center = height * 0.52 + 18 * np.sin(xx / 42)
    river_mask = np.abs(yy - river_center) < 14
    before[river_mask] = np.array([38, 96, 162], dtype=np.uint8)

    urban_core = ((xx - width * 0.35) / 76) ** 2 + ((yy - height * 0.42) / 48) ** 2 < 1
    before[urban_core] = np.array([145, 145, 145], dtype=np.uint8)

    road_mask = (np.abs(yy - (height * 0.7 - xx * 0.15)) < 4) | (np.abs(xx - width * 0.62) < 3)
    before[road_mask] = np.array([220, 203, 160], dtype=np.uint8)

    texture = rng.integers(-12, 13, size=before.shape, dtype=np.int16)
    before = np.clip(before.astype(np.int16) + texture, 0, 255).astype(np.uint8)

    urban_change = ((xx - width * 0.55) / 92) ** 2 + ((yy - height * 0.45) / 68) ** 2 < 1
    veg_loss = ((xx - width * 0.68) / 68) ** 2 + ((yy - height * 0.28) / 58) ** 2 < 1
    bare_land = ((xx - width * 0.72) / 55) ** 2 + ((yy - height * 0.68) / 36) ** 2 < 1
    water_change = (np.abs(yy - (height * 0.54 + 18 * np.sin((xx + 18) / 42))) < 9) & (xx > width * 0.48)

    if preset_id == "amazon-front":
        veg_loss = ((xx - width * 0.5) / 124) ** 2 + ((yy - height * 0.34) / 82) ** 2 < 1
        bare_land = ((xx - width * 0.58) / 110) ** 2 + ((yy - height * 0.6) / 48) ** 2 < 1
        urban_change = ((xx - width * 0.82) / 35) ** 2 + ((yy - height * 0.7) / 28) ** 2 < 1
        water_change = (np.abs(yy - (height * 0.56 + 10 * np.sin(xx / 18))) < 8) & (xx < width * 0.38)
    elif preset_id == "singapore-port":
        urban_change = ((xx > width * 0.48) & (yy > height * 0.28) & (yy < height * 0.76))
        water_change = (np.abs(yy - river_center) < 18) & (xx > width * 0.54)
        veg_loss = ((xx - width * 0.18) / 44) ** 2 + ((yy - height * 0.24) / 42) ** 2 < 1
        bare_land = ((xx - width * 0.78) / 34) ** 2 + ((yy - height * 0.17) / 26) ** 2 < 1
    elif preset_id == "dubai-marina":
        urban_change = ((xx - width * 0.64) / 88) ** 2 + ((yy - height * 0.48) / 62) ** 2 < 1
        water_change = (np.abs(yy - (height * 0.56 + 20 * np.sin((xx + 8) / 24))) < 15) & (xx > width * 0.44)
        bare_land = ((xx - width * 0.32) / 92) ** 2 + ((yy - height * 0.72) / 42) ** 2 < 1
        veg_loss = ((xx - width * 0.22) / 34) ** 2 + ((yy - height * 0.25) / 28) ** 2 < 1

    masks = {
        "urban_construction": urban_change,
        "vegetation_loss": veg_loss & ~urban_change,
        "water_body_change": water_change & ~urban_change,
        "bare_land_exposure": bare_land & ~urban_change,
    }
    combined_mask = np.zeros((height, width), dtype=bool)
    for mask in masks.values():
        combined_mask |= mask

    after = before.copy()
    after[masks["urban_construction"]] = np.array([173, 161, 150], dtype=np.uint8)
    after[masks["vegetation_loss"]] = np.array([123, 92, 66], dtype=np.uint8)
    after[masks["water_body_change"]] = np.array([63, 129, 197], dtype=np.uint8)
    after[masks["bare_land_exposure"]] = np.array([227, 219, 198], dtype=np.uint8)

    overlay = after.copy()
    overlay_layer = np.zeros_like(overlay)
    for key, mask in masks.items():
        overlay_layer[mask] = np.array(ImageColor.getrgb(COLOR_MAP[key]), dtype=np.uint8)
    overlay = np.clip(overlay * 0.58 + overlay_layer * 0.42, 0, 255).astype(np.uint8)

    mask_image = np.zeros((height, width, 3), dtype=np.uint8)
    mask_image[combined_mask] = np.array([239, 80, 69], dtype=np.uint8)

    ndvi_overlay = np.zeros_like(after)
    ndvi_overlay[:, :, 0] = np.where(combined_mask, 220, 80)
    ndvi_overlay[:, :, 1] = np.where(masks["vegetation_loss"], 105, 185)
    ndvi_overlay[:, :, 2] = np.where(masks["water_body_change"], 205, 70)
    ndvi_overlay = np.clip(after * 0.4 + ndvi_overlay * 0.6, 0, 255).astype(np.uint8)

    return {
        "before": Image.fromarray(before),
        "after": Image.fromarray(after),
        "overlay": Image.fromarray(overlay),
        "mask": Image.fromarray(mask_image),
        "ndvi_overlay": Image.fromarray(ndvi_overlay),
        "masks": masks,
        "combined_mask": combined_mask,
    }


def _annotate_frame(image: Image.Image, title: str, subtitle: str) -> Image.Image:
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)
    font = ImageFont.load_default()
    draw.rounded_rectangle((12, 12, 220, 54), radius=10, fill=(18, 27, 36))
    draw.text((22, 20), title, fill=(245, 247, 250), font=font)
    draw.text((22, 35), subtitle, fill=(169, 183, 196), font=font)
    return annotated


def build_timeline_gif(frames: list[tuple[int, Image.Image]]) -> str:
    if not frames:
        return ""
    output = io.BytesIO()
    frames[0][1].save(
        output,
        format="GIF",
        save_all=True,
        append_images=[frame for _, frame in frames[1:]],
        duration=700,
        loop=0,
    )
    return base64.b64encode(output.getvalue()).decode("utf-8")


def normalize_classification(counts: Dict[str, int], total_changed_pixels: int) -> Dict[str, Dict[str, float]]:
    safe_total = max(total_changed_pixels, 1)
    return {
        key: {
            "count": int(count),
            "percentage": round((count / safe_total) * 100, 2),
            "label": DISPLAY_LABELS[key],
            "color": COLOR_MAP[key],
        }
        for key, count in counts.items()
    }


def demo_analysis_result(
    *,
    location_name: str,
    preset_id: Optional[str],
    latitude: float,
    longitude: float,
    before_date: str,
    after_date: str,
    resolution_m: float,
    zoom_level: str,
    mode: str,
    timeline_years: int,
) -> Dict[str, Any]:
    demo_map = _draw_demo_map(preset_id or "custom", location_name, before_date, after_date)
    masks = demo_map["masks"]
    counts = {key: int(mask.sum()) for key, mask in masks.items()}
    changed_pixels = int(demo_map["combined_mask"].sum())
    total_pixels = demo_map["combined_mask"].size
    change_percentage = round((changed_pixels / total_pixels) * 100, 2)
    area_sq_km = area_sq_km_from_pixels(changed_pixels, resolution_m)
    football_fields = football_fields_from_sq_km(area_sq_km)
    severity = severity_from_percentage(change_percentage)
    dominant_change = max(counts.items(), key=lambda item: item[1])[0]
    classification = normalize_classification(counts, changed_pixels)

    start_year = max(2017, int(after_date[:4]) - timeline_years + 1)
    frames: list[tuple[int, Image.Image]] = []
    base_before = demo_map["before"]
    base_after = demo_map["after"]
    for year in range(start_year, start_year + timeline_years):
        progress = (year - start_year) / max(timeline_years - 1, 1)
        blended = Image.blend(base_before, base_after, progress)
        frames.append((year, _annotate_frame(blended, str(year), location_name)))

    timeline = {
        "years": [year for year, _ in frames],
        "frames": [{"year": year, "image": encode_image(frame)} for year, frame in frames],
        "gif": build_timeline_gif(frames),
    }

    return {
        "location": {
            "name": location_name,
            "preset_id": preset_id,
            "latitude": latitude,
            "longitude": longitude,
        },
        "dates": {"before": before_date, "after": after_date},
        "analysis_mode": mode,
        "demo_mode": True,
        "warnings": ["Live demo mode is enabled. Results are generated from deterministic sample assets instead of real Sentinel queries."],
        "statistics": {
            "changed_pixels": changed_pixels,
            "total_pixels": total_pixels,
            "change_percentage": change_percentage,
            "changed_area_sq_km": area_sq_km,
            "football_fields": football_fields,
            "severity": severity,
            "resolution_m": resolution_m,
            "estimated_credit_cost": estimate_credit_cost(True, len(frames)),
        },
        "classification": classification,
        "dominant_change": dominant_change,
        "images": {
            "before": encode_image(_annotate_frame(demo_map["before"], "Before", before_date)),
            "after": encode_image(_annotate_frame(demo_map["after"], "After", after_date)),
            "overlay": encode_image(_annotate_frame(demo_map["overlay"], "Change overlay", DISPLAY_LABELS[dominant_change])),
            "mask": encode_image(_annotate_frame(demo_map["mask"], "Binary mask", f"{change_percentage}% changed")),
            "ndvi_overlay": encode_image(_annotate_frame(demo_map["ndvi_overlay"], "NDVI overlay", "Green healthy / red-yellow degraded")),
            "classification_overlay": encode_image(_annotate_frame(demo_map["overlay"], "Category overlay", "Urban / vegetation / water / bare land")),
            "thumbnail": encode_image(demo_map["overlay"].resize((180, 120))),
        },
        "timeline": timeline,
        "report": {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "status": "ready",
        },
        "zoom_level": zoom_level,
    }


def classification_from_change_masks(change_masks: Dict[str, np.ndarray], changed_pixels: int) -> Dict[str, Dict[str, float]]:
    urban = int(change_masks.get("urbanization", np.zeros((1, 1), dtype=bool)).sum())
    vegetation = int(change_masks.get("vegetation_loss", np.zeros((1, 1), dtype=bool)).sum())
    water = int(change_masks.get("water_gain", np.zeros((1, 1), dtype=bool)).sum() + change_masks.get("water_loss", np.zeros((1, 1), dtype=bool)).sum())
    known = urban + vegetation + water
    bare = max(changed_pixels - known, 0)
    return normalize_classification(
        {
            "urban_construction": urban,
            "vegetation_loss": vegetation,
            "water_body_change": water,
            "bare_land_exposure": bare,
        },
        changed_pixels,
    )


def create_classification_overlay(
    after_image: Image.Image,
    change_masks: Dict[str, np.ndarray],
    model_mask: Optional[np.ndarray] = None,
) -> str:
    base = np.array(after_image.convert("RGB"))
    overlay = np.zeros_like(base)
    mapping = {
        "urbanization": "urban_construction",
        "vegetation_loss": "vegetation_loss",
        "water_gain": "water_body_change",
        "water_loss": "water_body_change",
    }
    occupied = np.zeros(base.shape[:2], dtype=bool)
    for original_key, display_key in mapping.items():
        mask = change_masks.get(original_key)
        if mask is not None:
            overlay[mask] = np.array(ImageColor.getrgb(COLOR_MAP[display_key]), dtype=np.uint8)
            occupied |= mask
    if model_mask is not None:
        bare_mask = (model_mask > 0) & ~occupied
        overlay[bare_mask] = np.array(ImageColor.getrgb(COLOR_MAP["bare_land_exposure"]), dtype=np.uint8)
    blended = np.clip(base * 0.58 + overlay * 0.42, 0, 255).astype(np.uint8)
    return encode_image(Image.fromarray(blended))


def build_report_payload(result: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    stats = result["statistics"]
    report_payload = {
        "title": f"Garuda Lens report for {result['location']['name']}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "user": user,
        "location": result["location"],
        "dates": result["dates"],
        "images": {
            "before": result["images"]["before"],
            "after": result["images"]["after"],
            "overlay": result["images"]["overlay"],
        },
        "statistics": {
            **stats,
            "dominant_change": DISPLAY_LABELS.get(result["dominant_change"], result["dominant_change"]),
        },
        "classification": result["classification"],
        "warnings": result.get("warnings", []),
    }
    return report_payload


def _draw_report_header(pdf: canvas.Canvas, title: str, timestamp: str) -> None:
    width, height = A4
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.rect(0, height - 110, width, 110, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#f8fafc"))
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(40, height - 58, "Garuda Lens")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(40, height - 80, title)
    pdf.drawRightString(width - 40, height - 80, f"Generated {timestamp}")
    pdf.setFillColor(colors.HexColor("#e2e8f0"))
    pdf.setFont("Helvetica", 12)
    pdf.drawString(40, height - 102, "Satellite change detection, NDVI, timeline, and category breakdown")


def _draw_report_pie(pdf: canvas.Canvas, classification: Dict[str, Dict[str, float]], x: int, y: int) -> None:
    drawing = Drawing(220, 170)
    pie = Pie()
    pie.x = 30
    pie.y = 10
    pie.width = 110
    pie.height = 110
    labels = []
    values = []
    colors_list = []
    for key, item in classification.items():
        values.append(max(item["count"], 0))
        labels.append(f"{item['label']} {item['percentage']}%")
        colors_list.append(colors.HexColor(item["color"]))
    pie.data = values or [1]
    pie.labels = labels or ["No classified change"]
    pie.slices.strokeWidth = 0.4
    for index, color_value in enumerate(colors_list):
        pie.slices[index].fillColor = color_value
    drawing.add(pie)
    drawing.add(String(10, 145, "Change category breakdown", fontName="Helvetica-Bold", fontSize=11))
    renderPDF.draw(drawing, pdf, x, y)


def build_pdf_report(report_payload: Dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    timestamp = report_payload["generated_at"].replace("T", " ").replace("Z", " UTC")

    _draw_report_header(pdf, report_payload["title"], timestamp)

    pdf.setFont("Helvetica-Bold", 14)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.drawString(40, height - 145, report_payload["location"]["name"])
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, height - 160, f"Coordinates: {report_payload['location']['latitude']:.5f}, {report_payload['location']['longitude']:.5f}")
    pdf.drawString(40, height - 174, f"Dates: {report_payload['dates']['before']} to {report_payload['dates']['after']}")
    pdf.drawString(40, height - 188, f"Prepared for: {report_payload['user']['full_name']} ({report_payload['user']['email']})")

    stats = report_payload["statistics"]
    pdf.setFillColor(colors.HexColor("#f8fafc"))
    pdf.roundRect(40, height - 288, width - 80, 78, 14, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(54, height - 230, "Analysis summary")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(54, height - 246, f"Change percentage: {stats['change_percentage']}%")
    pdf.drawString(250, height - 246, f"Changed area: {stats['changed_area_sq_km']} km²")
    pdf.drawString(54, height - 262, f"Football fields: {stats['football_fields']}")
    pdf.drawString(250, height - 262, f"Severity: {stats['severity']}")
    pdf.drawString(54, height - 278, f"Dominant change: {stats['dominant_change']}")

    image_y = height - 520
    slots = [(40, image_y), (215, image_y), (390, image_y)]
    labels = [("before", "Before image"), ("after", "After image"), ("overlay", "Overlay image")]
    for (key, label), (slot_x, slot_y) in zip(labels, slots):
        image = decode_image(report_payload["images"][key])
        reader = ImageReader(image)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(slot_x, slot_y + 152, label)
        pdf.drawImage(reader, slot_x, slot_y, width=155, height=145, preserveAspectRatio=True, mask="auto")

    _draw_report_pie(pdf, report_payload["classification"], 40, 60)

    pdf.setFont("Helvetica-Bold", 11)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.drawString(300, 195, "Category details")
    pdf.setFont("Helvetica", 10)
    row_y = 178
    for item in report_payload["classification"].values():
        pdf.setFillColor(colors.HexColor(item["color"]))
        pdf.rect(300, row_y - 3, 10, 10, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(316, row_y, f"{item['label']}: {item['percentage']}% ({item['count']} px)")
        row_y -= 18

    warnings = report_payload.get("warnings") or []
    if warnings:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(300, 102, "Notes")
        pdf.setFont("Helvetica", 9)
        text = pdf.beginText(300, 88)
        for warning in warnings[:3]:
            text.textLine(f"- {warning}")
        pdf.drawText(text)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()