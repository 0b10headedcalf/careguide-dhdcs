from typing import Any

from sqlmodel import Session

from app.models.form import FormFieldValue
from app.services.case_service import get_case_or_404, list_case_facts
from app.utils.json import dumps_json, loads_json


FIELD_MAP = {
    "location.zip": ("Residential ZIP code", "low"),
    "household.size": ("Tax household size", "high"),
    "income.estimate": ("Current monthly income", "medium"),
    "income.frequency": ("Income frequency", "medium"),
    "insurance.current_status": ("Current health insurance status", "low"),
    "insurance.recent_coverage_loss": ("Recent coverage loss", "medium"),
    "employer.coverage_offer": ("Access to employer-sponsored health coverage", "high"),
}


def map_fields_for_form(session: Session, case_id: str, form_id: str) -> dict:
    case = get_case_or_404(session, case_id)
    facts = {fact.canonical_name: fact for fact in list_case_facts(session, case_id, confirmed_only=False)}
    fields = []
    for canonical_name, (official_label, default_risk) in FIELD_MAP.items():
        fact = facts.get(canonical_name)
        value = loads_json(fact.value_json) if fact else None
        field = FormFieldValue(
            case_id=case_id,
            form_id=form_id,
            official_field_label=official_label,
            canonical_field_name=canonical_name,
            value_json=dumps_json(value),
            source_type=fact.source_type if fact else "rule",
            source_ref=f"case_fact:{fact.id}" if fact else "missing",
            confidence=fact.confidence if fact else 0.0,
            needs_review=True if not fact else fact.needs_review or not fact.confirmed_by_user,
            risk_level=fact.risk_level if fact else default_risk,
            explanation_simple=_explanation(canonical_name, value, fact is not None),
            user_confirmed=fact.confirmed_by_user if fact else False,
        )
        session.add(field)
        session.commit()
        session.refresh(field)
        fields.append(
            {
                "official_field_label": field.official_field_label,
                "canonical_field_name": field.canonical_field_name,
                "value": value,
                "source_type": field.source_type,
                "source_ref": field.source_ref,
                "confidence": field.confidence,
                "needs_review": field.needs_review,
                "risk_level": field.risk_level,
                "explanation_simple": field.explanation_simple,
            }
        )
    case.status = "form_drafted"
    session.add(case)
    session.commit()
    return {"form_id": form_id, "fields": fields}


def _explanation(canonical_name: str, value: Any, present: bool) -> str:
    if not present:
        return f"No confirmed value is available for {canonical_name}; this field needs review."
    return f"Based on the information provided, this maps {canonical_name} to a reviewable form field."
