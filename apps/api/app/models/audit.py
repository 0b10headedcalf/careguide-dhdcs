from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key


class AuditEvent(SQLModel, table=True):
    __tablename__ = "audit_events"

    id: str = primary_key()
    case_id: Optional[str] = Field(default=None, index=True, foreign_key="cases.id")
    event_type: str = Field(index=True)
    actor_type: str
    redacted_payload_json: str = Field(default="{}")
    created_at: datetime = created_at_field()

