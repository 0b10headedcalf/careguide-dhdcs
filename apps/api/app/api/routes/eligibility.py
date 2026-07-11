from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.eligibility import EvaluateRequest
from app.services.eligibility_engine import evaluate_case_pathway

router = APIRouter()


@router.post("/eligibility/evaluate")
def evaluate(payload: EvaluateRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(evaluate_case_pathway(session, payload.case_id), rid)

