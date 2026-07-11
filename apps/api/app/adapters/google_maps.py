from app.core.config import get_settings


class GoogleMapsAdapter:
    source_id = "google_maps"

    async def geocode_zip(self, zip_code: str) -> tuple[float, float] | None:
        settings = get_settings()
        if not settings.GOOGLE_MAPS_SERVER_API_KEY:
            return None
        return None

    async def nearby(self, *, lat: float | None, lng: float | None, radius_miles: float) -> list[dict]:
        settings = get_settings()
        if not settings.GOOGLE_MAPS_SERVER_API_KEY:
            return []
        return []

