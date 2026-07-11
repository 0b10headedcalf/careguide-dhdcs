from sqlmodel import Session

from app.adapters.datasf import DataSFAdapter
from app.adapters.google_maps import GoogleMapsAdapter
from app.adapters.hrsa import HRSAAdapter
from app.models.resource import Resource
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
    for adapter, priority in [(HRSAAdapter(), 1), (DataSFAdapter(), 2), (GoogleMapsAdapter(), 4)]:
        try:
            for record in await adapter.nearby(lat=lat, lng=lng, radius_miles=radius_miles):
                record["source_priority"] = priority
                records.append(record)
        except Exception:
            continue

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
                "is_cached": False,
                "reason_recommended": "Nearby verified HRSA health center." if resource.source_id == "hrsa_health_centers" else "Nearby public-source healthcare resource.",
            }
        )
    output.sort(key=lambda item: (item["distance_miles"] is None, item["distance_miles"] or 9999))
    return {"resources": output}
