from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.schemas.forms import (
    CaseOnlyRequest,
    FormAnswerRequest,
    FormConfirmFieldRequest,
    FormMapRequest,
    FormNextQuestionRequest,
)
from app.services.form_assistant import confirm_form_field, next_form_question, propose_form_answer
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


@router.post("/forms/next-question")
def forms_next_question(
    payload: FormNextQuestionRequest,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return success(
        next_form_question(
            session,
            payload.case_id,
            language=payload.language,
            form_id=payload.form_id,
        ),
        rid,
    )


@router.post("/forms/ask")
def forms_ask(
    payload: FormNextQuestionRequest,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return success(
        next_form_question(
            session,
            payload.case_id,
            language=payload.language,
            form_id=payload.form_id,
        ),
        rid,
    )


@router.post("/forms/answer")
def forms_answer(
    payload: FormAnswerRequest,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return success(
        propose_form_answer(
            session,
            payload.case_id,
            answer=payload.answer,
            language=payload.language,
            form_id=payload.form_id,
            field_name=payload.field_name,
            source_type="user_voice" if payload.input_mode == "voice" else "user_text",
        ),
        rid,
    )


@router.post("/forms/confirm-field")
def forms_confirm_field(
    payload: FormConfirmFieldRequest,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    return success(
        confirm_form_field(
            session,
            payload.case_id,
            form_id=payload.form_id,
            field_name=payload.field_name,
            official_label=payload.official_label,
            value=payload.value,
            source_type=payload.source_type,
            confidence=payload.confidence,
            needs_review=payload.needs_review,
            explanation=payload.explanation,
            confirmed=payload.confirmed,
            language=payload.language,
        ),
        rid,
    )
