from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.api.dependencies import request_id
from app.adapters.elevenlabs import ElevenLabsAdapter
from app.adapters.vapi import verify_vapi_secret
from app.db.session import get_session
from app.schemas.common import error, success
from app.schemas.voice import VapiWebhookRequest
from app.services.intake_normalizer import next_question
from app.services.intake_service import submit_intake_message

router = APIRouter()

MAX_AUDIO_BYTES = 10 * 1024 * 1024


@router.post("/voice/transcribe")
async def voice_transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    rid: str = Depends(request_id),
):
    adapter = ElevenLabsAdapter()
    if not adapter.configured():
        return JSONResponse(
            status_code=503,
            content=error(
                "stt_not_configured",
                "Voice transcription is not configured. Please type your answer instead.",
                rid,
            ),
        )
    contents = await audio.read()
    if not contents:
        return JSONResponse(
            status_code=422,
            content=error("empty_audio", "No audio was received.", rid),
        )
    if len(contents) > MAX_AUDIO_BYTES:
        return JSONResponse(
            status_code=413,
            content=error("audio_too_large", "The recording is too long. Please try a shorter answer.", rid),
        )
    transcript = await adapter.transcribe(
        contents,
        mime_type=audio.content_type or "audio/webm",
        language=language,
    )
    if transcript is None:
        return JSONResponse(
            status_code=502,
            content=error(
                "transcription_failed",
                "We couldn't transcribe that. Try again, or type your answer.",
                rid,
            ),
        )
    return success({"transcript": transcript, "language": language}, rid)


@router.post("/voice/vapi/webhook")
async def vapi_webhook(
    payload: VapiWebhookRequest,
    x_vapi_secret: str | None = Header(default=None),
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    configured = verify_vapi_secret(x_vapi_secret)
    warnings = [] if configured else ["Vapi webhook secret is not configured or did not match."]
    next_q = next_question({}, payload.language)
    if payload.case_id and payload.transcript:
        result = await submit_intake_message(session, payload.case_id, payload.transcript, payload.language, "voice")
        next_q = result["next_question"]
    return success({"configured": configured, "next_question": next_q, "warnings": warnings}, rid)

