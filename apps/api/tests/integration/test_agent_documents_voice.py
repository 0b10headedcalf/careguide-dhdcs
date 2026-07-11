import json
from types import SimpleNamespace


def test_agent_has_useful_fallback_when_not_configured(client, case_id):
    response = client.post(
        "/api/agent/message",
        json={
            "case_id": case_id,
            "message": "What does household size mean?",
            "language": "en",
            "explanation_level": "simple",
            "form_id": "CCFRM604",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["agent_available"] is False
    assert data["assistant_message"]
    assert data["next_question"]
    assert data["suggested_case_updates"] == []


def test_gradient_agent_is_called_server_side(client, case_id, monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "assistant_message": "Let us review the next form question.",
                                    "next_question": "What is your household size?",
                                    "suggested_case_updates": [],
                                    "form_field_candidates": [],
                                    "needs_confirmation": False,
                                    "safety_flags": [],
                                    "next_action": "Continue intake",
                                }
                            )
                        }
                    }
                ]
            }

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            assert url == "https://agent.example/api/v1/chat/completions"
            assert headers["Authorization"] == "Bearer server-secret"
            assert json["stream"] is False
            return Response()

    monkeypatch.setattr(
        "app.services.gradient_agent.get_settings",
        lambda: SimpleNamespace(
            GRADIENT_AGENT_ENDPOINT="https://agent.example",
            GRADIENT_AGENT_ACCESS_KEY="server-secret",
            APP_ENV="production",
        ),
    )
    monkeypatch.setattr("app.services.gradient_agent.httpx.AsyncClient", lambda **kwargs: Client())

    response = client.post(
        "/api/agent/message",
        json={
            "case_id": case_id,
            "message": "Help with this form",
            "language": "en",
            "explanation_level": "simple",
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["agent_available"] is True


def test_text_document_upload_list_and_confirmation(client, case_id):
    uploaded = client.post(
        "/api/documents/upload",
        data={"case_id": case_id, "document_type": "income_statement"},
        files={"file": ("income.txt", b"Monthly income varies and needs review.", "text/plain")},
    )
    assert uploaded.status_code == 200
    document = uploaded.json()["data"]
    assert document["status"] == "uploaded"
    assert document["extraction_status"] == "complete"
    assert document["needs_confirmation"] is True
    assert "needs review" in document["extracted_text_preview"]

    listed = client.get(f"/api/cases/{case_id}/documents")
    assert listed.status_code == 200
    assert len(listed.json()["data"]["documents"]) == 1

    confirmed = client.post(
        f"/api/documents/{document['document_id']}/confirm",
        json={"confirmed": True},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["data"]["confirmed_by_user"] is True
    assert confirmed.json()["data"]["needs_confirmation"] is False


def test_image_upload_never_fakes_ocr(client, case_id):
    response = client.post(
        "/api/documents/upload",
        data={"case_id": case_id},
        files={"file": ("proof.png", b"not-real-image-content", "image/png")},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["extraction_status"] == "unsupported"
    assert data["extracted_text_preview"] is None
    assert data["needs_confirmation"] is True


def test_document_and_voice_validation(client, case_id):
    invalid_document = client.post(
        "/api/documents/upload",
        data={"case_id": case_id},
        files={"file": ("malware.exe", b"invalid", "application/octet-stream")},
    )
    assert invalid_document.status_code == 400

    invalid_audio = client.post(
        "/api/voice/transcribe",
        data={"case_id": case_id},
        files={"file": ("audio.txt", b"not audio", "text/plain")},
    )
    assert invalid_audio.status_code == 400

    unavailable = client.post(
        "/api/voice/transcribe",
        data={"case_id": case_id, "language_code": "en"},
        files={"file": ("audio.webm", b"audio-bytes", "audio/webm")},
    )
    assert unavailable.status_code == 400
    assert "not configured" in unavailable.json()["error"]["message"]


def test_elevenlabs_transcription_is_called_server_side(client, case_id, monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "text": "I need help with coverage.",
                "language_code": "en",
                "language_probability": 0.99,
                "words": [],
            }

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, data, files):
            assert url == "https://api.elevenlabs.io/v1/speech-to-text"
            assert headers == {"xi-api-key": "server-eleven-key"}
            assert data["model_id"] == "scribe_v2"
            assert files["file"][2] == "audio/webm"
            return Response()

    monkeypatch.setattr(
        "app.services.elevenlabs_stt.get_settings",
        lambda: SimpleNamespace(ELEVENLABS_API_KEY="server-eleven-key", ELEVENLABS_STT_MODEL="scribe_v2"),
    )
    monkeypatch.setattr("app.services.elevenlabs_stt.httpx.AsyncClient", lambda **kwargs: Client())
    response = client.post(
        "/api/voice/transcribe",
        data={"case_id": case_id, "language_code": "en"},
        files={"file": ("recording.webm", b"audio-bytes", "audio/webm")},
    )
    assert response.status_code == 200
    assert response.json()["data"]["text"] == "I need help with coverage."
    assert response.json()["data"]["source"] == "elevenlabs"
