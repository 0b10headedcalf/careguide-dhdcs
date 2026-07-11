from sqlmodel import Session, col, select

from app.core.config import get_settings
from app.models.source import SourceSnapshot
from app.rules.loader import load_json
from app.utils.dates import utc_now_iso


def source_health(session: Session) -> list[dict]:
    settings = get_settings()
    registry = load_json(settings.resolved_path(settings.SOURCE_REGISTRY_PATH))
    results = []
    for source in registry:
        snapshot = session.exec(
            select(SourceSnapshot)
            .where(SourceSnapshot.source_id == source["source_id"])
            .order_by(col(SourceSnapshot.retrieved_at).desc())
        ).first()
        status = "cached_only" if snapshot else "unavailable"
        results.append(
            {
                "source_id": source["source_id"],
                "status": status,
                "last_success_at": snapshot.retrieved_at.isoformat() if snapshot else None,
                "last_attempt_at": utc_now_iso(),
                "current_cache_age_hours": None,
                "official_url": source["base_url"],
                "message": "Cached official snapshot available." if snapshot else "No live source check has run yet.",
            }
        )
    return results

