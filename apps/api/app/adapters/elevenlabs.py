import httpx

from app.core.config import get_settings

# ElevenLabs Scribe accepts ISO 639-1 codes; the app only exposes these two.
LANGUAGE_CODES = {"en": "en", "es": "es"}


class ElevenLabsAdapter:
    provider_name = "elevenlabs"

    def configured(self) -> bool:
        return bool(get_settings().ELEVENLABS_API_KEY)

    async def transcribe(self, audio: bytes, *, mime_type: str, language: str) -> str | None:
        """Speech-to-text via ElevenLabs Scribe. Returns None on any failure —
        callers surface a typed error so the UI can offer the typing fallback."""
        settings = get_settings()
        if not settings.ELEVENLABS_API_KEY:
            return None
        data = {"model_id": settings.ELEVENLABS_STT_MODEL_ID}
        code = LANGUAGE_CODES.get(language)
        if code:
            data["language_code"] = code
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    settings.ELEVENLABS_STT_URL,
                    headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                    data=data,
                    files={"file": ("recording", audio, mime_type or "audio/webm")},
                )
                response.raise_for_status()
                text = response.json().get("text", "")
        except (httpx.HTTPError, ValueError):
            return None
        text = text.strip() if isinstance(text, str) else ""
        return text or None
