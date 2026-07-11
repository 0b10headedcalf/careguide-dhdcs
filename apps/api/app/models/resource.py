from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import primary_key


class Resource(SQLModel, table=True):
    __tablename__ = "resources"

    id: str = primary_key()
    external_resource_id: str = Field(index=True)
    source_id: str = Field(index=True)
    source_type: str
    source_url: str
    retrieved_at: datetime
    content_hash: str
    name: str
    resource_type: str
    address: Optional[str] = None
    phone: Optional[str] = None
    url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    verified_language_support_json: str = Field(default="[]")
    services_json: str = Field(default="[]")
    raw_normalized_json: str = Field(default="{}")

