from pathlib import Path
from typing import Any

from sqlmodel import Session

from app.core.config import get_settings
from app.models.source import SourceSnapshot
from app.utils.dates import hours_from_now, utc_now
from app.utils.hashing import sha256_json
from app.utils.json import dumps_json


def cache_official_response(
    session: Session,
    source_id: str,
    source_type: str,
    source_url: str,
    payload: Any,
    status_code: int | None = None,
) -> SourceSnapshot:
    settings = get_settings()
    content_hash = sha256_json(payload)
    date_prefix = utc_now().date().isoformat()
    base_dir = settings.resolved_path(settings.OFFICIAL_CACHE_DIR) / source_id
    base_dir.mkdir(parents=True, exist_ok=True)
    response_path = base_dir / f"{date_prefix}-{content_hash}.json"
    response_path.write_text(dumps_json(payload), encoding="utf-8")
    snapshot = SourceSnapshot(
        source_id=source_id,
        source_type=source_type,
        source_url=source_url,
        retrieved_at=utc_now(),
        content_hash=content_hash,
        status_code=status_code,
        response_path=str(response_path),
        is_current=True,
        expires_at=hours_from_now(settings.CACHE_TTL_HOURS),
    )
    session.add(snapshot)
    session.commit()
    session.refresh(snapshot)
    return snapshot

