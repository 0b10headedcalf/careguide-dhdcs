from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key


class HandoffPacket(SQLModel, table=True):
    __tablename__ = "handoff_packets"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    packet_version: str = Field(default="1")
    user_reviewed: bool = Field(default=False)
    html_path_or_content_ref: str
    source_list_json: str = Field(default="[]")
    created_at: datetime = created_at_field()

