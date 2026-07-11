import json
from pathlib import Path

from sqlmodel import Session, col, select

from app.adapters.datasf import DataSFAdapter
from app.adapters.google_maps import GoogleMapsAdapter
from app.adapters.hrsa import HRSAAdapter
from app.models.resource import Resource
from app.models.source import SourceSnapshot
from app.utils.dates import parse_datetime
from app.utils.distance import haversine_miles
from app.utils.hashing import sha256_json
from app.utils.json import dumps_json


async def get_nearby_resources(
    session: Session,
    *,
    case_id: str | None,
    zip_code: str | None,
    lat: float | None,
    lng: float | None,
    language: str | None,
    needs: str | None,
    radius_miles: float,
) -> dict:
    if lat is None or lng is None:
        geocoded = await GoogleMapsAdapter().geocode_zip(zip_code) if zip_code else None
        if geocoded:
            lat, lng = geocoded
    if lat is None or lng is None:
        return {"resources": []}

    records: list[dict] = []
    live_source_ids: set[str] = set()
    for adapter, priority in [(HRSAAdapter(), 1), (DataSFAdapter(), 2), (GoogleMapsAdapter(), 4)]:
        try:
            fetched = await adapter.nearby(lat=lat, lng=lng, radius_miles=radius_miles)
            if fetched:
                live_source_ids.add(adapter.source_id)
            for record in fetched:
                record["source_priority"] = priority
                record["is_cached"] = False
                records.append(record)
        except Exception:
            continue

    # Fallback: if a source was down or returned nothing, hydrate its most recent
    # cached_official snapshot. Snapshots are labeled as cached in the response so
    # the UI can badge them; never invent data.
    for source_id, priority in [("hrsa_health_centers", 1), ("datasf_health_care_facilities", 2)]:
        if source_id in live_source_ids:
            continue
        for record in _load_cached_snapshot(session, source_id):
            record["source_priority"] = priority
            record["is_cached"] = True
            records.append(record)

    output = []
    for record in records:
        if not record.get("name") or not record.get("source_id") or not record.get("source_url"):
            continue
        distance = None
        if record.get("lat") is not None and record.get("lng") is not None:
            distance = haversine_miles(lat, lng, float(record["lat"]), float(record["lng"]))
        if distance is not None and distance > radius_miles:
            continue
        resource = Resource(
            external_resource_id=record.get("external_resource_id") or record["name"],
            source_id=record["source_id"],
            source_type=record["source_type"],
            source_url=record["source_url"],
            retrieved_at=parse_datetime(record["retrieved_at"]),
            content_hash=sha256_json(record),
            name=record["name"],
            resource_type=record["resource_type"],
            address=record.get("address"),
            phone=record.get("phone"),
            url=record.get("url"),
            lat=record.get("lat"),
            lng=record.get("lng"),
            verified_language_support_json=dumps_json(record.get("verified_language_support", [])),
            services_json=dumps_json(record.get("services", [])),
            raw_normalized_json=dumps_json(record.get("raw_normalized", {})),
        )
        session.add(resource)
        session.commit()
        session.refresh(resource)
        output.append(
            {
                "resource_id": resource.id,
                "name": resource.name,
                "type": resource.resource_type,
                "address": resource.address,
                "phone": resource.phone,
                "url": resource.url,
                "lat": resource.lat,
                "lng": resource.lng,
                "distance_miles": round(distance, 2) if distance is not None else None,
                "verified_language_support": record.get("verified_language_support", []),
                "source_id": resource.source_id,
                "source_url": resource.source_url,
                "retrieved_at": str(resource.retrieved_at),
                "is_cached": bool(record.get("is_cached", False)),
                "reason_recommended": "Nearby verified HRSA health center." if resource.source_id == "hrsa_health_centers" else "Nearby public-source healthcare resource.",
            }
        )
    output.sort(key=lambda item: (item["distance_miles"] is None, item["distance_miles"] or 9999))
    return {"resources": output}


def _load_cached_snapshot(session: Session, source_id: str) -> list[dict]:
    """Read the most recent SourceSnapshot for source_id and return its records.

    Returns [] if no snapshot exists or the file is unreadable. Never invents
    records; snapshots carry their own source_url + retrieved_at.
    """
    snapshot = session.exec(
        select(SourceSnapshot)
        .where(SourceSnapshot.source_id == source_id)
        .order_by(col(SourceSnapshot.retrieved_at).desc())
    ).first()
    if not snapshot:
        return []
    path = Path(snapshot.response_path)
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(payload, list):
        return []
    return payload
