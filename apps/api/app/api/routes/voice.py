from fastapi import APIRouter, Depends, Header
from sqlmodel import Session

from app.api.dependencies import request_id
from app.adapters.vapi import verify_vapi_secret
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.voice import VapiWebhookRequest
from app.services.intake_normalizer import next_question
from app.services.intake_service import submit_intake_message

router = APIRouter()


@router.post("/voice/vapi/webhook")
def vapi_webhook(
    payload: VapiWebhookRequest,
    x_vapi_secret: str | None = Header(default=None),
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    configured = verify_vapi_secret(x_vapi_secret)
    warnings = [] if configured else ["Vapi webhook secret is not configured or did not match."]
    next_q = next_question({}, payload.language)
    if payload.case_id and payload.transcript:
        result = submit_intake_message(session, payload.case_id, payload.transcript, payload.language, "voice")
        next_q = result["next_question"]
    return success({"configured": configured, "next_question": next_q, "warnings": warnings}, rid)

