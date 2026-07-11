from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key


class IntakeMessage(SQLModel, table=True):
    __tablename__ = "intake_messages"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    role: str = Field(index=True)
    language: str = Field(default="en")
    redacted_content: str
    raw_content_encrypted_or_null: Optional[str] = None
    created_at: datetime = created_at_field()

