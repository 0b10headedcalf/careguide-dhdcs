"""Seed data/cached_official/ with one real DataSF + one HRSA snapshot.

Run once so a WiFi/API outage during demo can fall back to cached official data
labeled with source_url + retrieved_at.

Usage (from apps/api/):
    python scripts/seed_cache.py --lat 37.7599 --lng -122.4148 --radius 5
"""
from __future__ import annotations

import argparse
import asyncio
import sys

from sqlmodel import Session

from app.adapters.datasf import DataSFAdapter
from app.adapters.hrsa import HRSAAdapter
from app.core.config import get_settings
from app.db.init_db import init_db
from app.db.session import engine
from app.services.cache_service import cache_official_response


async def seed(lat: float, lng: float, radius_miles: float) -> None:
    settings = get_settings()

    datasf = DataSFAdapter()
    try:
        datasf_records = await datasf.nearby(lat=lat, lng=lng, radius_miles=radius_miles)
    except Exception as exc:
        print(f"[seed] DataSF fetch failed: {exc}", file=sys.stderr)
        datasf_records = []

    hrsa = HRSAAdapter()
    try:
        hrsa_records = await hrsa.nearby(lat=lat, lng=lng, radius_miles=radius_miles)
    except Exception as exc:
        print(f"[seed] HRSA fetch failed: {exc}", file=sys.stderr)
        hrsa_records = []

    with Session(engine) as session:
        if datasf_records:
            snap = cache_official_response(
                session=session,
                source_id="datasf_health_care_facilities",
                source_type="public_api",
                source_url=settings.DATASF_HEALTH_FACILITIES_URL,
                payload=datasf_records,
                status_code=200,
            )
            print(f"[seed] DataSF: {len(datasf_records)} records -> {snap.response_path}")
        else:
            print("[seed] DataSF: no records fetched")

        if hrsa_records:
            snap = cache_official_response(
                session=session,
                source_id="hrsa_health_centers",
                source_type="public_api",
                source_url=settings.HRSA_ARCGIS_QUERY_URL,
                payload=hrsa_records,
                status_code=200,
            )
            print(f"[seed] HRSA: {len(hrsa_records)} records -> {snap.response_path}")
        else:
            print("[seed] HRSA: no records fetched")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, default=37.7599, help="Latitude (default: SF Mission 94110)")
    parser.add_argument("--lng", type=float, default=-122.4148, help="Longitude (default: SF Mission 94110)")
    parser.add_argument("--radius", type=float, default=5.0, help="Radius in miles (default: 5)")
    args = parser.parse_args()

    init_db()
    asyncio.run(seed(args.lat, args.lng, args.radius))


if __name__ == "__main__":
    main()
