from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key


class UploadedDocument(SQLModel, table=True):
    __tablename__ = "uploaded_documents"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    filename: str
    document_type: Optional[str] = None
    mime_type: str
    size_bytes: int
    sha256: str = Field(index=True)
    storage_path: str
    status: str = "uploaded"
    extraction_status: str = "pending"
    extracted_text: Optional[str] = None
    needs_confirmation: bool = True
    confirmed_by_user: bool = False
    created_at: datetime = created_at_field()
