# CareBridge CA API

FastAPI backend for the CareBridge CA coverage-navigation flow.

The backend is deterministic where correctness matters. The LLM layer can suggest language, extraction, clarification, and summaries, but it does not decide eligibility, choose official forms, verify packets, invent resources, submit forms, sign documents, or appoint representatives.

## Local Setup

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Then test:

```bash
curl http://localhost:8000/api/health
```

## Core Flow

1. `POST /api/cases`
2. `PATCH /api/cases/{case_id}` (language preference)
3. `POST /api/intake/message`
4. `POST /api/intake/confirm`
5. `POST /api/eligibility/evaluate`
6. `POST /api/forms/route`
7. `POST /api/forms/map-fields`
8. `POST /api/forms/verify`
9. `GET /api/resources/nearby`
10. `GET /api/cases/{case_id}/action-plan`
11. `POST /api/handoff-passport`

## Voice Agent and Documents

- `POST /api/agent/message`
- `POST /api/forms/ask`
- `POST /api/forms/next-question`
- `POST /api/voice/transcribe` (multipart audio)
- `POST /api/documents/upload` (multipart document)
- `GET /api/cases/{case_id}/documents`
- `POST /api/documents/{document_id}/confirm`

## DigitalOcean App Platform

- Use Python 3.11.
- Configure `DATABASE_URL` with managed PostgreSQL for production.
- Store secrets as encrypted App Platform environment variables.
- Run `alembic upgrade head` as a deployment job where available.
- Do not run SQLite with multiple production replicas.

## Optional Providers

The API runs without DigitalOcean, NVIDIA, Vapi, or Google Maps credentials. Without optional keys:

- intake uses deterministic fallback;
- HRSA/DataSF public sources are attempted only when coordinates are supplied;
- Google results are omitted;
- Vapi webhook returns a configuration warning;
- no fake fallback resources are shown.
