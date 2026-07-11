from app.adapters.elevenlabs import ElevenLabsAdapter
from app.core.config import get_settings


def _fake_key(monkeypatch, value: str):
    settings = get_settings()
    monkeypatch.setattr(settings, "ELEVENLABS_API_KEY", value)


def test_transcribe_unconfigured_returns_typed_error(client, monkeypatch):
    _fake_key(monkeypatch, "")
    response = client.post(
        "/api/voice/transcribe",
        files={"audio": ("recording.webm", b"\x1aE\xdf\xa3fake", "audio/webm")},
        data={"language": "en"},
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "stt_not_configured"


def test_transcribe_empty_audio_rejected(client, monkeypatch):
    _fake_key(monkeypatch, "test-key")
    response = client.post(
        "/api/voice/transcribe",
        files={"audio": ("recording.webm", b"", "audio/webm")},
        data={"language": "en"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "empty_audio"


def test_transcribe_success_returns_transcript(client, monkeypatch):
    _fake_key(monkeypatch, "test-key")

    async def fake_transcribe(self, audio, *, mime_type, language):
        assert audio == b"\x1aE\xdf\xa3fake"
        assert language == "es"
        return "Perdí mi seguro"

    monkeypatch.setattr(ElevenLabsAdapter, "transcribe", fake_transcribe)
    response = client.post(
        "/api/voice/transcribe",
        files={"audio": ("recording.webm", b"\x1aE\xdf\xa3fake", "audio/webm")},
        data={"language": "es"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["transcript"] == "Perdí mi seguro"


def test_transcribe_provider_failure_returns_typed_error(client, monkeypatch):
    _fake_key(monkeypatch, "test-key")

    async def fake_transcribe(self, audio, *, mime_type, language):
        return None

    monkeypatch.setattr(ElevenLabsAdapter, "transcribe", fake_transcribe)
    response = client.post(
        "/api/voice/transcribe",
        files={"audio": ("recording.webm", b"\x1aE\xdf\xa3fake", "audio/webm")},
        data={"language": "en"},
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "transcription_failed"
