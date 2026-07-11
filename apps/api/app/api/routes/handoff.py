from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.handoff import HandoffRequest
from app.services.handoff_service import create_handoff_packet, get_handoff_packet_html

router = APIRouter()


@router.post("/handoff-passport")
def handoff_passport(payload: HandoffRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(create_handoff_packet(session, payload.case_id, payload.user_reviewed), rid)


@router.get("/handoff-passport/{packet_id}/html", response_class=HTMLResponse)
def handoff_passport_html(packet_id: str, session: Session = Depends(get_session)):
    """Return the packet as raw HTML so a browser can open and print it directly."""
    html = get_handoff_packet_html(session, packet_id)
    if html is None:
        raise HTTPException(status_code=404, detail="Handoff packet not found")
    return HTMLResponse(content=html, status_code=200)
