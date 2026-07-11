from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.case import CaseCreate
from app.schemas.common import success
from app.services.case_service import case_detail, create_case

router = APIRouter()


@router.post("/cases")
def create_case_route(payload: CaseCreate, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    case = create_case(session, payload)
    return success(
        {
            "case_id": case.id,
            "language": case.language,
            "explanation_style": case.explanation_style,
            "status": case.status,
            "created_at": case.created_at.isoformat(),
        },
        rid,
    )


@router.get("/cases/{case_id}")
def get_case_route(case_id: str, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(case_detail(session, case_id), rid)

