import httpx

from app.core.config import get_settings


async def transcribe_audio(
    *,
    data: bytes,
    filename: str,
    content_type: str,
    language_code: str | None,
) -> dict:
    settings = get_settings()
    if not settings.ELEVENLABS_API_KEY:
        raise ValueError("Voice transcription is unavailable because ElevenLabs is not configured.")
    form = {
        "model_id": settings.ELEVENLABS_STT_MODEL,
        "timestamps_granularity": "word",
        "tag_audio_events": "false",
    }
    if language_code:
        form["language_code"] = language_code
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                getattr(settings, "ELEVENLABS_STT_URL", "https://api.elevenlabs.io/v1/speech-to-text"),
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                data=form,
                files={"file": (filename, data, content_type)},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 401:
            raise ValueError(
                "Voice transcription is unavailable: the ElevenLabs API key was rejected "
                "(missing the speech_to_text permission). You can continue by typing."
            ) from exc
        raise ValueError("Voice transcription service is unavailable. You can continue by typing.") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise ValueError("Voice transcription service is unavailable. You can continue by typing.") from exc
    return {
        "text": payload.get("text", ""),
        "language_code": payload.get("language_code"),
        "language_probability": payload.get("language_probability"),
        "words": payload.get("words", []),
        "source": "elevenlabs",
        "needs_user_confirmation": True,
    }
