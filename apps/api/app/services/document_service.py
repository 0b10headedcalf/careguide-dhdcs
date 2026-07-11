import hashlib
import re
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from pypdf import PdfReader
from sqlmodel import Session, select

from app.core.config import get_settings
from app.models.document import UploadedDocument
from app.services.case_service import get_case_or_404


ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt"}
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}


def _safe_filename(filename: str | None) -> str:
    name = Path(filename or "document").name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned or "document"


def _extract_text(data: bytes, extension: str) -> tuple[str, str | None]:
    if extension == ".txt":
        return "complete", data.decode("utf-8", errors="replace").strip()
    if extension == ".pdf":
        try:
            text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(data)).pages).strip()
            return ("complete", text) if text else ("failed", None)
        except Exception:
            return "failed", None
    return "unsupported", None


async def upload_document(
    session: Session,
    case_id: str,
    upload: UploadFile,
    document_type: str | None,
) -> dict:
    get_case_or_404(session, case_id)
    settings = get_settings()
    filename = _safe_filename(upload.filename)
    extension = Path(filename).suffix.lower()
    mime_type = upload.content_type or "application/octet-stream"
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported document type. Upload PDF, PNG, JPG, WEBP, or TXT.")
    if extension in {".png", ".jpg", ".jpeg", ".webp"} and mime_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("The document content type does not match the selected image.")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await upload.read(max_bytes + 1)
    if not data:
        raise ValueError("The uploaded document is empty.")
    if len(data) > max_bytes:
        raise ValueError(f"Document exceeds the {settings.MAX_UPLOAD_MB} MB limit.")

    digest = hashlib.sha256(data).hexdigest()
    root = Path(settings.UPLOAD_DIR)
    if not root.is_absolute():
        root = (Path(__file__).resolve().parents[2] / root).resolve()
    case_dir = root / case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    path = case_dir / f"{digest}_{filename}"
    path.write_bytes(data)

    extraction_status, extracted_text = _extract_text(data, extension)
    existing = session.exec(
        select(UploadedDocument)
        .where(UploadedDocument.case_id == case_id)
        .where(UploadedDocument.sha256 == digest)
    ).first()
    document = existing or UploadedDocument(
        case_id=case_id,
        filename=filename,
        document_type=document_type,
        mime_type=mime_type,
        size_bytes=len(data),
        sha256=digest,
        storage_path=str(path),
    )
    document.filename = filename
    document.document_type = document_type
    document.mime_type = mime_type
    document.size_bytes = len(data)
    document.storage_path = str(path)
    document.extraction_status = extraction_status
    document.extracted_text = extracted_text
    document.needs_confirmation = True
    document.confirmed_by_user = False
    session.add(document)
    session.commit()
    session.refresh(document)
    return document_data(document)


def document_data(document: UploadedDocument) -> dict:
    preview = document.extracted_text[:500] if document.extracted_text else None
    return {
        "document_id": document.id,
        "case_id": document.case_id,
        "filename": document.filename,
        "document_type": document.document_type,
        "mime_type": document.mime_type,
        "size_bytes": document.size_bytes,
        "sha256": document.sha256,
        "status": document.status,
        "extraction_status": document.extraction_status,
        "extracted_text_preview": preview,
        "needs_confirmation": document.needs_confirmation,
        "confirmed_by_user": document.confirmed_by_user,
    }


def list_documents(session: Session, case_id: str) -> list[dict]:
    get_case_or_404(session, case_id)
    documents = session.exec(
        select(UploadedDocument).where(UploadedDocument.case_id == case_id)
    ).all()
    return [document_data(document) for document in documents]


def confirm_document(session: Session, document_id: str, confirmed: bool) -> dict:
    document = session.get(UploadedDocument, document_id)
    if not document:
        raise ValueError("Document not found.")
    document.confirmed_by_user = confirmed
    document.needs_confirmation = not confirmed
    session.add(document)
    session.commit()
    session.refresh(document)
    return document_data(document)
