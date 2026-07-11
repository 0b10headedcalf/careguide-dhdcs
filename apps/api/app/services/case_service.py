from typing import Any

from sqlmodel import Session, col, select

from app.core.constants import SUPPORTED_LANGUAGES
from app.core.exceptions import CaseNotFoundError
from app.models.case import Case, CaseFact
from app.models.form import FormRoute
from app.models.pathway import PathwayResult
from app.models.resource import Resource
from app.schemas.case import CaseCreate
from app.utils.dates import utc_now
from app.utils.json import dumps_json, loads_json


def create_case(session: Session, payload: CaseCreate) -> Case:
    if payload.language not in SUPPORTED_LANGUAGES:
        raise ValueError("Unsupported language. Supported languages are en and es.")
    case = Case(
        language=payload.language,
        explanation_style=payload.explanation_style,
        consent_status=payload.consent_status,
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    return case


def get_case_or_404(session: Session, case_id: str) -> Case:
    case = session.get(Case, case_id)
    if not case:
        raise CaseNotFoundError("Case not found", {"case_id": case_id})
    return case


def list_case_facts(session: Session, case_id: str, confirmed_only: bool = False) -> list[CaseFact]:
    statement = select(CaseFact).where(CaseFact.case_id == case_id)
    if confirmed_only:
        statement = statement.where(CaseFact.confirmed_by_user == True)  # noqa: E712
    return list(session.exec(statement).all())


def facts_as_dict(session: Session, case_id: str, confirmed_only: bool = True) -> dict[str, Any]:
    facts = list_case_facts(session, case_id, confirmed_only=confirmed_only)
    return {fact.canonical_name: loads_json(fact.value_json) for fact in facts}


def upsert_fact(
    session: Session,
    case_id: str,
    canonical_name: str,
    value: Any,
    source_type: str,
    source_ref: str,
    confidence: float,
    confirmed_by_user: bool,
    needs_review: bool,
    risk_level: str,
) -> CaseFact:
    existing = session.exec(
        select(CaseFact)
        .where(CaseFact.case_id == case_id)
        .where(CaseFact.canonical_name == canonical_name)
        .where(CaseFact.confirmed_by_user == confirmed_by_user)
    ).first()
    if existing:
        existing.value_json = dumps_json(value)
        existing.source_type = source_type
        existing.source_ref = source_ref
        existing.confidence = confidence
        existing.needs_review = needs_review
        existing.risk_level = risk_level
        existing.updated_at = utc_now()
        fact = existing
    else:
        fact = CaseFact(
            case_id=case_id,
            canonical_name=canonical_name,
            value_json=dumps_json(value),
            source_type=source_type,
            source_ref=source_ref,
            confidence=confidence,
            confirmed_by_user=confirmed_by_user,
            needs_review=needs_review,
            risk_level=risk_level,
        )
        session.add(fact)
    session.commit()
    session.refresh(fact)
    return fact


def latest_pathway(session: Session, case_id: str) -> PathwayResult | None:
    return session.exec(
        select(PathwayResult)
        .where(PathwayResult.case_id == case_id)
        .order_by(col(PathwayResult.created_at).desc())
    ).first()


def case_detail(session: Session, case_id: str) -> dict:
    case = get_case_or_404(session, case_id)
    facts = [
        {
            "canonical_name": fact.canonical_name,
            "value": loads_json(fact.value_json),
            "source_type": fact.source_type,
            "source_ref": fact.source_ref,
            "confidence": fact.confidence,
            "confirmed_by_user": fact.confirmed_by_user,
            "needs_review": fact.needs_review,
            "risk_level": fact.risk_level,
        }
        for fact in list_case_facts(session, case_id, confirmed_only=False)
    ]
    pathway = latest_pathway(session, case_id)
    routes = session.exec(select(FormRoute).where(FormRoute.case_id == case_id)).all()
    resources = session.exec(select(Resource).limit(0)).all()
    verification_flags = []
    if pathway:
        verification_flags = loads_json(pathway.verification_flags_json, [])
    progress = {
        "intake_complete": bool(facts),
        "forms_triggered": len(routes),
        "resources_selected": len(resources),
        "next_action": "Continue intake" if not facts else "Review likely pathway",
    }
    return {
        "case_id": case.id,
        "language": case.language,
        "explanation_style": case.explanation_style,
        "status": case.status,
        "consent_status": case.consent_status,
        "user_reviewed": case.user_reviewed,
        "facts": facts,
        "latest_pathway_result": {
            "pathway": pathway.pathway,
            "explanation_simple": pathway.explanation_simple,
            "rule_ids": loads_json(pathway.rule_ids_json, []),
            "missing_questions": loads_json(pathway.missing_questions_json, []),
        }
        if pathway
        else None,
        "triggered_forms": [
            {
                "form_id": route.form_id,
                "form_name": route.form_name,
                "official_url": route.official_url,
                "status": route.status,
            }
            for route in routes
        ],
        "verification_flags": verification_flags,
        "recommended_resources": [],
        "progress_summary": progress,
    }

