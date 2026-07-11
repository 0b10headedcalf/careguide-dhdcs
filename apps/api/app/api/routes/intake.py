from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.intake import IntakeConfirmRequest, IntakeMessageRequest
from app.services.intake_service import confirm_case_fact, submit_intake_message

router = APIRouter()


@router.post("/intake/message")
async def intake_message(payload: IntakeMessageRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    data = await submit_intake_message(session, payload.case_id, payload.message, payload.language, payload.input_mode)
    return success(data, rid)


@router.post("/intake/confirm")
def intake_confirm(payload: IntakeConfirmRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    data = confirm_case_fact(session, payload.case_id, payload.canonical_name, payload.value, payload.confirmed)
    return success(data, rid)

