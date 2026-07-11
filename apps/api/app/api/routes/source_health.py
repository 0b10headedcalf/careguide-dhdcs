from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.services.source_health_service import source_health

router = APIRouter()


@router.get("/source-health")
def get_source_health(session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(source_health(session), rid)

