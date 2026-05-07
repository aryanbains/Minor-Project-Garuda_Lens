"""
Planet Labs API service — replaces Sentinel Hub for satellite imagery.
Uses PSScene (PlanetScope 4-band imagery, ~3m resolution).
"""

import io
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple

import numpy as np
import requests
from PIL import Image

PLANET_BASE = "https://api.planet.com/data/v1"
ACTIVATION_TIMEOUT = 120  # seconds to wait for asset activation


class PlanetError(Exception):
    pass


class PlanetAuthError(PlanetError):
    pass


def _session(api_key: str) -> requests.Session:
    s = requests.Session()
    s.auth = (api_key, "")
    return s


def _search_scenes(
    api_key: str,
    lon: float,
    lat: float,
    date_from: str,
    date_to: str,
    max_cloud: float = 0.15,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Search PSScene items near a coordinate within a date range."""
    s = _session(api_key)
    payload = {
        "item_types": ["PSScene"],
        "filter": {
            "type": "AndFilter",
            "config": [
                {
                    "type": "GeometryFilter",
                    "field_name": "geometry",
                    "config": {"type": "Point", "coordinates": [lon, lat]},
                },
                {
                    "type": "DateRangeFilter",
                    "field_name": "acquired",
                    "config": {
                        "gte": f"{date_from}T00:00:00Z",
                        "lte": f"{date_to}T23:59:59Z",
                    },
                },
                {
                    "type": "RangeFilter",
                    "field_name": "cloud_cover",
                    "config": {"lte": max_cloud},
                },
            ],
        },
    }
    r = s.post(f"{PLANET_BASE}/quick-search", json=payload, timeout=20)
    if r.status_code == 401:
        raise PlanetAuthError("Invalid Planet API key")
    r.raise_for_status()
    return r.json().get("features", [])[:limit]


def find_planet_dates(
    api_key: str,
    lon: float,
    lat: float,
    buf: float,
    t0: Optional[str],
    t1: Optional[str],
) -> Tuple[Optional[str], Optional[str], List[Dict[str, str]]]:
    """
    Find a before and after date for change detection.
    Returns (before_date, after_date, all_dates_list).
    """
    date_from = t0 or "2018-01-01"
    date_to = t1 or datetime.utcnow().strftime("%Y-%m-%d")

    try:
        features = _search_scenes(api_key, lon, lat, date_from, date_to, max_cloud=0.15, limit=250)
    except PlanetAuthError:
        raise
    except Exception as exc:
        raise PlanetError(f"Planet search failed: {exc}")

    if not features:
        return None, None, []

    # Deduplicate by date, keep lowest cloud cover per day
    by_date: Dict[str, float] = {}
    for f in features:
        d = f["properties"]["acquired"][:10]
        cc = float(f["properties"].get("cloud_cover") or 1.0)
        if d not in by_date or cc < by_date[d]:
            by_date[d] = cc

    sorted_dates = sorted(by_date.items())
    all_dates = [{"date": d, "cloud": f"{c:.2f}"} for d, c in sorted_dates]

    n = len(sorted_dates)
    q = max(1, n // 4)
    first_q = sorted_dates[:q] if n >= 4 else sorted_dates[: max(1, n // 2)]
    last_q = sorted_dates[-q:] if n >= 4 else sorted_dates[-max(1, n // 2):]

    before = min(first_q, key=lambda x: x[1])
    after = min(last_q, key=lambda x: x[1])

    return before[0], after[0], all_dates


def _get_thumbnail(api_key: str, item_id: str, item_type: str = "PSScene") -> Optional[Image.Image]:
    """Fetch the quick-look thumbnail for a scene (no activation needed)."""
    s = _session(api_key)
    # First get the item to find the real thumbnail URL from _links
    item_r = s.get(f"{PLANET_BASE}/item-types/{item_type}/items/{item_id}", timeout=15)
    if item_r.ok:
        thumb_url = item_r.json().get("_links", {}).get("thumbnail")
        if thumb_url:
            r = s.get(thumb_url, timeout=30)
            if r.ok and r.headers.get("content-type", "").startswith("image"):
                return Image.open(io.BytesIO(r.content)).convert("RGB")
    # Fallback: tiles subdomain
    url = f"https://tiles.planet.com/data/v1/item-types/{item_type}/items/{item_id}/thumb"
    r = s.get(url, timeout=30)
    if r.ok and r.headers.get("content-type", "").startswith("image"):
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    return None


def _activate_and_download(api_key: str, item_id: str, asset_type: str = "ortho_visual") -> Optional[bytes]:
    """Activate a Planet asset and download it once ready."""
    s = _session(api_key)
    assets_url = f"{PLANET_BASE}/item-types/PSScene/items/{item_id}/assets"
    r = s.get(assets_url, timeout=15)
    if not r.ok:
        return None
    assets = r.json()

    if asset_type not in assets:
        # Fall back to analytic_sr or basic_analytic
        for fallback in ("analytic_sr", "basic_analytic_4b", "ortho_analytic_4b"):
            if fallback in assets:
                asset_type = fallback
                break
        else:
            return None

    asset = assets[asset_type]
    status = asset.get("status")

    if status == "inactive":
        # Request activation
        activate_url = asset["_links"]["activate"]
        s.get(activate_url, timeout=15)

    # Poll until active
    deadline = time.time() + ACTIVATION_TIMEOUT
    while time.time() < deadline:
        r = s.get(assets_url, timeout=15)
        if not r.ok:
            break
        asset = r.json().get(asset_type, {})
        if asset.get("status") == "active":
            dl_url = asset["location"]
            img_r = s.get(dl_url, timeout=60, stream=True)
            if img_r.ok:
                return img_r.content
            return None
        time.sleep(5)

    return None


def fetch_planet_image(
    api_key: str,
    lon: float,
    lat: float,
    date: str,
    buf: float,
) -> Optional[Dict[str, Any]]:
    """
    Fetch a Planet scene for the given date and location.
    Returns {"raw": np.ndarray (H,W,3), "rgb": PIL.Image} or None.

    Uses thumbnail first (fast, no activation), then falls back to full asset.
    """
    try:
        # Find the best scene for this date
        features = _search_scenes(api_key, lon, lat, date, date, max_cloud=0.3, limit=10)
        if not features:
            # Widen ±2 days
            d = datetime.strptime(date, "%Y-%m-%d")
            d_from = (d - timedelta(days=2)).strftime("%Y-%m-%d")
            d_to = (d + timedelta(days=2)).strftime("%Y-%m-%d")
            features = _search_scenes(api_key, lon, lat, d_from, d_to, max_cloud=0.3, limit=10)

        if not features:
            return None

        item_id = features[0]["id"]

        # Attempt thumbnail (fast path — always available, no credits)
        thumb = _get_thumbnail(api_key, item_id)
        if thumb is not None:
            raw = np.array(thumb.resize((512, 512)))
            return {"raw": raw, "rgb": thumb.resize((512, 512))}

        return None
    except PlanetAuthError:
        raise
    except Exception as exc:
        print(f"[Planet] fetch_planet_image failed for {date}: {exc}")
        return None


def _find_best_planet_scene_for_year(
    api_key: str,
    lon: float,
    lat: float,
    year: int,
) -> Optional[str]:
    """Return the lowest-cloud date for a given year."""
    try:
        features = _search_scenes(
            api_key, lon, lat,
            f"{year}-01-01", f"{year}-12-31",
            max_cloud=0.2, limit=100
        )
        if not features:
            return None
        best = min(features, key=lambda f: float(f["properties"].get("cloud_cover") or 1.0))
        return best["properties"]["acquired"][:10]
    except Exception:
        return None
