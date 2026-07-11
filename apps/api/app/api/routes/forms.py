from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.forms import CaseOnlyRequest, FormMapRequest
from app.services.field_mapper import map_fields_for_form
from app.services.form_router import route_forms_for_case
from app.services.verification_engine import verify_packet

router = APIRouter()


@router.post("/forms/route")
def route_forms(payload: CaseOnlyRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success({"triggered_forms": route_forms_for_case(session, payload.case_id)}, rid)


@router.post("/forms/map-fields")
def map_fields(payload: FormMapRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(map_fields_for_form(session, payload.case_id, payload.form_id), rid)


@router.post("/forms/verify")
def verify_form(payload: FormMapRequest, session: Session = Depends(get_session), rid: str = Depends(request_id)):
    return success(verify_packet(session, payload.case_id, payload.form_id), rid)

