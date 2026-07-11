from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from sqlmodel import Session

from app.api.dependencies import request_id
from app.adapters.vapi import verify_vapi_secret
from app.core.config import get_settings
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.voice import VapiWebhookRequest
from app.services.intake_normalizer import next_question
from app.services.intake_service import submit_intake_message
from app.services.elevenlabs_stt import transcribe_audio

router = APIRouter()

ALLOWED_RECORDING_TYPES = {
    "audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4",
    "video/webm", "video/mp4",
}


@router.post("/voice/transcribe")
async def voice_transcribe(
    file: UploadFile = File(...),
    language_code: str | None = Form(default=None),
    case_id: str | None = Form(default=None),
):
    del case_id
    content_type = file.content_type or "application/octet-stream"
    base_content_type = content_type.split(";", 1)[0].lower()
    if base_content_type not in ALLOWED_RECORDING_TYPES:
        raise ValueError("Unsupported audio type.")
    settings = get_settings()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if not data:
        raise ValueError("The audio recording is empty.")
    if len(data) > max_bytes:
        raise ValueError(f"Audio exceeds the {settings.MAX_UPLOAD_MB} MB limit.")
    return success(
        await transcribe_audio(
            data=data,
            filename=file.filename or "recording.webm",
            content_type=base_content_type,
            language_code=language_code,
        ),
        "voice-transcription",
    )


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
