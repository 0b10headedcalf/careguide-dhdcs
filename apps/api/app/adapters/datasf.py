import httpx

from app.core.config import get_settings
from app.utils.dates import utc_now_iso


# 1 mile in meters, per NIST (int() truncates to 1609 which matches SODA docs' examples).
METERS_PER_MILE = 1609.34

# Fallback fetch cap when no coordinates are supplied. Keep this small — this is
# the "give me any SF facilities" path and callers are expected to pass lat/lng
# in every normal case.
DEFAULT_UNFILTERED_LIMIT = 50

# Cap when spatial filtering is applied. Larger than the unfiltered cap because
# the caller has already narrowed to a location and we want the full set nearby.
DEFAULT_SPATIAL_LIMIT = 200


class DataSFAdapter:
    source_id = "datasf_health_care_facilities"

    async def nearby(self, *, lat: float | None, lng: float | None, radius_miles: float) -> list[dict]:
        settings = get_settings()
        headers = {"X-App-Token": settings.DATASF_APP_TOKEN} if settings.DATASF_APP_TOKEN else {}

        if lat is not None and lng is not None:
            # jhsu-2pka is SF only; spatial filter honestly returns 0 outside SF
            # instead of returning irrelevant SF facilities for a non-SF ZIP.
            radius_meters = max(1, int(radius_miles * METERS_PER_MILE))
            params = {
                "$limit": DEFAULT_SPATIAL_LIMIT,
                "$where": f"within_circle(location, {lat}, {lng}, {radius_meters})",
            }
        else:
            params = {"$limit": DEFAULT_UNFILTERED_LIMIT}

        async with httpx.AsyncClient(timeout=8, headers=headers) as client:
            response = await client.get(settings.DATASF_HEALTH_FACILITIES_URL, params=params)
            response.raise_for_status()
            payload = response.json()
        return [normalize_datasf_record(record, settings.DATASF_HEALTH_FACILITIES_URL) for record in payload]


def normalize_datasf_record(record: dict, source_url: str) -> dict:
    name = (
        record.get("facility_name")
        or record.get("name")
        or record.get("facility")
        or record.get("organization_name")
    )
    point = record.get("point") or record.get("location") or {}
    coordinates = point.get("coordinates", [None, None]) if isinstance(point, dict) else [None, None]
    lat = (point.get("latitude") or coordinates[1]) if isinstance(point, dict) else None
    lng = (point.get("longitude") or coordinates[0]) if isinstance(point, dict) else None
    return {
        "external_resource_id": str(record.get("objectid") or record.get("facility_id") or name),
        "name": name,
        "resource_type": record.get("facility_type") or record.get("type") or "datasf_health_facility",
        "address": record.get("address") or record.get("street_address"),
        "phone": record.get("phone") or record.get("phone_number"),
        "url": record.get("url") or record.get("website"),
        "lat": lat,
        "lng": lng,
        "verified_language_support": [],
        "services": _as_list(record.get("services")),
        "source_id": "datasf_health_care_facilities",
        "source_type": "public_api",
        "source_url": source_url,
        "retrieved_at": utc_now_iso(),
        "raw_normalized": record,
    }


def _as_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    return [str(value)]
