from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.documents import DocumentConfirmRequest
from app.services.document_service import confirm_document, list_documents, upload_document

router = APIRouter()


@router.post("/documents/upload")
async def document_upload(
    case_id: str = Form(...),
    document_type: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return success(await upload_document(session, case_id, file, document_type), rid)


@router.get("/cases/{case_id}/documents")
def case_documents(case_id: str, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success({"documents": list_documents(session, case_id)}, rid)


@router.post("/documents/{document_id}/confirm")
def document_confirm(
    document_id: str,
    payload: DocumentConfirmRequest,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return success(confirm_document(session, document_id, payload.confirmed), rid)
