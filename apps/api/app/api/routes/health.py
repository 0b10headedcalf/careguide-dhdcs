from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel import Session

from app.api.dependencies import request_id
from app.core.config import get_settings
from app.db.session import get_session
from app.rules.loader import load_json, load_yaml
from app.schemas.common import success

router = APIRouter()


@router.get("/health")
def health(session: Session = Depends(get_session), rid: str = Depends(request_id)):
    database = "ok"
    try:
        session.exec(text("select 1"))
    except Exception:
        database = "error"
    settings = get_settings()
    return success({"status": "ok", "app": settings.APP_NAME, "environment": settings.APP_ENV, "database": database}, rid)


@router.get("/ready")
def ready(session: Session = Depends(get_session), rid: str = Depends(request_id)):
    settings = get_settings()
    checks = {"database": "ok", "rules": "ok", "form_catalog": "ok", "source_registry": "ok"}
    try:
        session.exec(text("select 1"))
        load_yaml(settings.resolved_path(settings.RULES_ELIGIBILITY_PATH))
        load_json(settings.resolved_path(settings.FORM_CATALOG_PATH))
        load_json(settings.resolved_path(settings.SOURCE_REGISTRY_PATH))
    except Exception as exc:
        checks["error"] = str(exc)
    return success(checks, rid)
