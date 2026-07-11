# Build context: repo root (matches apps/web/Dockerfile), so config.py's
# ../../data and ../../rules paths resolve to the mounted repo assets.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser

COPY apps/api/requirements.txt ./apps/api/requirements.txt
RUN pip install --no-cache-dir -r apps/api/requirements.txt

COPY apps/api ./apps/api
COPY data ./data
COPY rules ./rules

# The app expects config.py-relative paths to reach data/ and rules/ at repo
# root. WORKDIR at /app/apps/api mirrors that layout so ../../data resolves
# to /app/data and ../../rules to /app/rules.
WORKDIR /app/apps/api

# Ownership so appuser can write the SQLite DB into WORKDIR at runtime.
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
