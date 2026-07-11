from pydantic import BaseModel


class DocumentData(BaseModel):
    document_id: str
    case_id: str
    filename: str
    document_type: str | None
    mime_type: str
    size_bytes: int
    sha256: str
    status: str
    extraction_status: str
    extracted_text_preview: str | None
    needs_confirmation: bool
    confirmed_by_user: bool


class DocumentListData(BaseModel):
    documents: list[DocumentData]


class DocumentConfirmRequest(BaseModel):
    confirmed: bool
