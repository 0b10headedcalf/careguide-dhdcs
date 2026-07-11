from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.handoff import HandoffRequest
from app.services.handoff_service import create_handoff_packet

router = APIRouter()


@router.post("/handoff-passport")
def handoff_passport(payload: HandoffRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(create_handoff_packet(session, payload.case_id, payload.user_reviewed), rid)

