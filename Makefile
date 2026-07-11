# CareBridge CA — root convenience commands.
# The Next.js frontend lives at apps/web/, the FastAPI backend at apps/api/.
# Everything below is a shortcut so teammates do not need to remember the
# per-app paths after the monorepo split.

.PHONY: help install dev api web test test-api test-web seed-cache personas ship-check

help:
	@echo "CareBridge CA — root make targets"
	@echo ""
	@echo "  make install       Install backend + frontend deps"
	@echo "  make dev           Start API and web dev servers in parallel"
	@echo "  make api           Start API only (uvicorn on :8000)"
	@echo "  make web           Start web only (next dev)"
	@echo "  make test          Run backend + frontend checks"
	@echo "  make test-api      Run backend pytest"
	@echo "  make test-web      Run frontend type-check"
	@echo "  make seed-cache    Seed data/cached_official from SF Mission"
	@echo "  make personas      Regenerate docs/analysis/pathway_distribution"
	@echo "  make ship-check    Full pre-ship: tests + typecheck + build"

install:
	cd apps/api && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd apps/web && bun install

dev:
	@echo "Starting API on :8000 and web on :3000. Ctrl+C stops both."
	@trap 'kill 0' INT; \
	  (cd apps/api && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000) & \
	  (cd apps/web && bun dev) & \
	  wait

api:
	cd apps/api && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

web:
	cd apps/web && bun dev

test: test-api test-web

test-api:
	cd apps/api && . .venv/bin/activate && python -m pytest

test-web:
	cd apps/web && bunx tsc --noEmit

seed-cache:
	cd apps/api && . .venv/bin/activate && PYTHONPATH=. python scripts/seed_cache.py

personas:
	cd apps/api && . .venv/bin/activate && PYTHONPATH=. python scripts/analyze_personas.py

ship-check: test-api test-web
	cd apps/web && rm -rf .next && \
	  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-stub} \
	  NEXT_PUBLIC_API_BASE_URL=$${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000} \
	  bun run build
