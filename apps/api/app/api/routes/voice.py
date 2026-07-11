from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.api.dependencies import request_id
from app.adapters.elevenlabs import ElevenLabsAdapter
from app.adapters.vapi import verify_vapi_secret
from app.core.config import get_settings
from app.db.session import get_session
from app.schemas.common import error, success
from app.schemas.voice import VapiWebhookRequest
from app.services.case_service import get_case_or_404
from app.services.elevenlabs_stt import transcribe_audio
from app.services.intake_normalizer import next_question
from app.services.intake_service import submit_intake_message

router = APIRouter()

ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".mp3", ".mp4", ".m4a", ".ogg", ".mpeg"}
ALLOWED_AUDIO_MIME_PREFIXES = ("audio/",)
ALLOWED_AUDIO_MIME_TYPES = {"video/mp4", "application/ogg"}


@router.post("/voice/transcribe")
async def voice_transcribe(
    file: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    case_id: str | None = Form(default=None),
    language_code: str | None = Form(default=None),
    language: str | None = Form(default=None),
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    if case_id:
        get_case_or_404(session, case_id)
    settings = get_settings()
    upload = file or audio
    if upload is None:
        raise ValueError("No audio file was received.")
    filename = Path(upload.filename or "recording.webm").name
    extension = Path(filename).suffix.lower()
    content_type = upload.content_type or "application/octet-stream"
    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        raise ValueError("Unsupported audio type. Upload WEBM, WAV, MP3, MP4, M4A, OGG, or MPEG.")
    if not (content_type.startswith(ALLOWED_AUDIO_MIME_PREFIXES) or content_type in ALLOWED_AUDIO_MIME_TYPES):
        raise ValueError("Unsupported audio content type.")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await upload.read(max_bytes + 1)
    if not data:
        return JSONResponse(status_code=422, content=error("empty_audio", "No audio was received.", rid))
    if len(data) > max_bytes:
        return JSONResponse(
            status_code=413,
            content=error("audio_too_large", f"Audio exceeds the {settings.MAX_UPLOAD_MB} MB limit.", rid),
        )
    if audio is not None and file is None:
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
        transcript = await adapter.transcribe(
            data,
            mime_type=content_type,
            language=language or language_code or "en",
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
        return success(
            {
                "transcript": transcript,
                "text": transcript,
                "language_code": language or language_code,
                "language_probability": None,
                "words": [],
                "source": "elevenlabs",
                "needs_user_confirmation": True,
            },
            rid,
        )

    result = await transcribe_audio(
        data=data,
        filename=filename,
        content_type=content_type,
        language_code=language_code or language,
    )
    result["needs_user_confirmation"] = True
    result["transcript"] = result.get("text", "")
    return success(result, rid)


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
