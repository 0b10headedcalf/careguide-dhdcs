from typing import Optional

from pydantic import BaseModel, Field


class ResourceData(BaseModel):
    resource_id: str
    name: str
    type: str
    address: Optional[str] = None
    phone: Optional[str] = None
    url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    distance_miles: Optional[float] = None
    verified_language_support: list[str] = Field(default_factory=list)
    source_id: str
    source_url: str
    retrieved_at: str
    is_cached: bool
    reason_recommended: str


class NearbyResourcesData(BaseModel):
    resources: list[ResourceData] = Field(default_factory=list)

