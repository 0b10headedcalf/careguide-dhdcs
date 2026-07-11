from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import primary_key


class SourceSnapshot(SQLModel, table=True):
    __tablename__ = "source_snapshots"

    id: str = primary_key()
    source_id: str = Field(index=True)
    source_type: str
    source_url: str
    retrieved_at: datetime
    content_hash: str
    status_code: Optional[int] = None
    response_path: str
    is_current: bool = Field(default=True)
    expires_at: datetime

