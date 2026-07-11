import httpx

from app.core.config import get_settings
from app.utils.dates import utc_now_iso


class HRSAAdapter:
    source_id = "hrsa_health_centers"

    async def nearby(self, *, lat: float | None, lng: float | None, radius_miles: float) -> list[dict]:
        if lat is None or lng is None:
            return []
        settings = get_settings()
        params = {
            "f": "json",
            "returnGeometry": "true",
            "outFields": "*",
            "geometry": f"{lng},{lat}",
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "distance": int(radius_miles * 1609.34),
            "units": "esriSRUnit_Meter",
        }
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(settings.HRSA_ARCGIS_QUERY_URL, params=params)
            response.raise_for_status()
            payload = response.json()
        return [normalize_hrsa_feature(feature, settings.HRSA_ARCGIS_QUERY_URL) for feature in payload.get("features", [])]


def normalize_hrsa_feature(feature: dict, source_url: str) -> dict:
    attrs = feature.get("attributes", {}) or {}
    geometry = feature.get("geometry", {}) or {}
    address = ", ".join(
        part
        for part in [
            attrs.get("SITE_ADDRESS"),
            attrs.get("SITE_CITY"),
            attrs.get("SITE_STATE_ABBR"),
            attrs.get("SITE_ZIP_CD"),
        ]
        if part
    )
    return {
        "external_resource_id": str(attrs.get("OBJECTID") or attrs.get("SITE_ID") or attrs.get("SITE_NM") or ""),
        "name": attrs.get("SITE_NM"),
        "resource_type": "hrsa_health_center",
        "address": address or None,
        "phone": attrs.get("SITE_PHONE_NUM"),
        "url": attrs.get("SITE_URL"),
        "lat": geometry.get("y") or attrs.get("LATITUDE"),
        "lng": geometry.get("x") or attrs.get("LONGITUDE"),
        "verified_language_support": [],
        "services": [value for value in [attrs.get("HCC_TYP_DESC")] if value],
        "source_id": "hrsa_health_centers",
        "source_type": "public_api",
        "source_url": source_url,
        "retrieved_at": utc_now_iso(),
        "raw_normalized": attrs,
    }
