from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.agent import AgentMessageRequest
from app.schemas.common import success
from app.services.gradient_agent import call_gradient_agent

router = APIRouter()


async def _respond(payload: AgentMessageRequest, session: Session, rid: str):
    data = await call_gradient_agent(
        session,
        case_id=payload.case_id,
        message=payload.message,
        language=payload.language,
        explanation_level=payload.explanation_level,
        form_id=payload.form_id,
        debug=payload.debug,
    )
    return success(data, rid)


@router.post("/agent/message")
async def agent_message(
    payload: AgentMessageRequest,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return await _respond(payload, session, rid)

