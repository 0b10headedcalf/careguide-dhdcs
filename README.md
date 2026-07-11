# CareGuide

Multilingual coverage-to-care agent for uninsured or recently uninsured Californians.
Built for the DigitalOcean + MLH AI for Social Good hackathon.

## What it does

Takes a user from confusion to a reviewable coverage packet plus a trusted local
handoff. Not a submission tool. Not medical or legal advice.

## Non-negotiables

- Real official data only — Covered California, HRSA, DataSF, Google Maps.
- Every mapped form field carries: `source`, `confidence`, `needs_review`.
- LLM suggests; deterministic rules decide.
- Say "likely pathway", never "eligible".

Full rules: [`docs/safety.md`](docs/safety.md).

## Architecture

Next.js (`apps/web/`) → FastAPI (`apps/api/`) → deterministic services + LLM gateway
→ real-data adapters (DataSF, HRSA, Google Maps, Covered California).

## Source of truth per topic

| Topic          | File                                              |
|----------------|---------------------------------------------------|
| Safety rules   | [`docs/safety.md`](docs/safety.md)                |
| External URLs  | [`docs/sources.md`](docs/sources.md)              |
| API contracts  | [`shared/schemas/`](shared/schemas/) + `apps/api/app/schemas/` |
| Data sources   | [`data/source_registry.json`](data/source_registry.json) |
| Form catalog   | [`data/form_catalog.json`](data/form_catalog.json) |
| Eligibility    | [`rules/eligibility_rules.yaml`](rules/eligibility_rules.yaml) |
| Form routing   | [`rules/form_routes.yaml`](rules/form_routes.yaml) |
| Architecture   | [`docs/backend-architecture.md`](docs/backend-architecture.md) |

## Local setup

Backend:

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd apps/web
bun install
cp .env.example .env.local  # set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_API_BASE_URL
bun dev
```

## Seed the official cache

Populate `data/cached_official/` so a WiFi / API outage cannot kill a demo:

```bash
cd apps/api
PYTHONPATH=. python scripts/seed_cache.py --lat 37.7599 --lng -122.4148 --radius 5
```

Snapshots carry `source_url` + `retrieved_at`. The UI must label cached results
as cached.
