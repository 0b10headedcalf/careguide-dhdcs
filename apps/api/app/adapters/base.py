from typing import Protocol


class ResourceAdapter(Protocol):
    source_id: str

    async def nearby(self, *, lat: float | None, lng: float | None, radius_miles: float) -> list[dict]:
        ...

