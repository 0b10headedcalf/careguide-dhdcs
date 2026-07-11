from typing import Any

from sqlmodel import Session

from app.core.config import get_settings
from app.core.constants import HIGH_RISK_FACTS
from app.models.form import FormFieldValue
from app.rules.loader import load_yaml
from app.services.case_service import get_case_or_404, list_case_facts, upsert_fact
from app.services.field_mapper import FIELD_MAP
from app.utils.json import dumps_json


PRIMARY_FORM_ID = "CCFRM604"

FIELD_DETAILS: dict[str, dict[str, str]] = {
    "location.zip": {
        "section": "Applicant",
        "official_label": "Residential ZIP code",
        "question": "What ZIP code do you live in?",
        "why_needed": "ZIP code helps identify the correct coverage pathway and local help area.",
        "answer_type": "text",
    },
    "household.size": {
        "section": "Household",
        "official_label": "Tax household size",
        "question": "How many people are in your household?",
        "why_needed": "Household size affects which likely pathway and income rules may apply.",
        "answer_type": "number",
    },
    "income.estimate": {
        "section": "Income",
        "official_label": "Current monthly income",
        "question": "What is your approximate household income?",
        "why_needed": "Income must be reviewed before preparing a coverage application packet.",
        "answer_type": "number",
    },
    "income.frequency": {
        "section": "Income",
        "official_label": "Income frequency",
        "question": "How often do you receive that income?",
        "why_needed": "Frequency helps interpret income in the right time period.",
        "answer_type": "choice",
    },
    "insurance.current_status": {
        "section": "Coverage",
        "official_label": "Current health insurance status",
        "question": "Do you currently have health insurance?",
        "why_needed": "Current coverage can affect which coverage steps should be reviewed next.",
        "answer_type": "choice",
    },
    "insurance.recent_coverage_loss": {
        "section": "Coverage",
        "official_label": "Recent coverage loss",
        "question": "Did you recently lose health coverage?",
        "why_needed": "A recent coverage change may affect timing and next steps.",
        "answer_type": "choice",
    },
    "employer.coverage_offer": {
        "section": "Employer coverage",
        "official_label": "Access to employer-sponsored health coverage",
        "question": "Are you offered health insurance through an employer?",
        "why_needed": "Employer coverage is an official application topic and should be reviewed.",
        "answer_type": "choice",
    },
}

SPANISH_QUESTIONS = {
    "location.zip": "¿En qué código postal vive?",
    "household.size": "¿Cuántas personas hay en su hogar?",
    "income.estimate": "¿Cuál es el ingreso aproximado de su hogar?",
    "income.frequency": "¿Con qué frecuencia recibe ese ingreso?",
    "insurance.current_status": "¿Tiene seguro de salud actualmente?",
    "insurance.recent_coverage_loss": "¿Perdió cobertura de salud recientemente?",
    "employer.coverage_offer": "¿Le ofrecen seguro de salud por medio de un empleador?",
}

SPANISH_WHY = {
    "location.zip": "El código postal ayuda a identificar la vía de cobertura y ayuda local adecuada.",
    "household.size": "El tamaño del hogar puede afectar la vía probable y las reglas de ingresos.",
    "income.estimate": "El ingreso debe revisarse antes de preparar un paquete de solicitud.",
    "income.frequency": "La frecuencia ayuda a interpretar el ingreso en el período correcto.",
    "insurance.current_status": "La cobertura actual puede afectar los próximos pasos.",
    "insurance.recent_coverage_loss": "Un cambio reciente de cobertura puede afectar los plazos.",
    "employer.coverage_offer": "La cobertura por empleo es una pregunta oficial que debe revisarse.",
}


def next_form_question(
    session: Session,
    case_id: str,
    *,
    language: str = "en",
    form_id: str = PRIMARY_FORM_ID,
) -> dict:
    get_case_or_404(session, case_id)
    field_name = _next_missing_field(session, case_id)
    if not field_name:
        return _response(
            session,
            case_id,
            language=language,
            form_id=form_id,
            current_field=None,
            field_candidate=None,
            assistant_message=_ready_message(language),
            next_action="continue_section",
        )

    return _response(
        session,
        case_id,
        language=language,
        form_id=form_id,
        current_field=field_name,
        field_candidate=None,
        assistant_message=_ask_message(language),
        next_action="ask_question",
    )


def propose_form_answer(
    session: Session,
    case_id: str,
    *,
    answer: str,
    language: str = "en",
    form_id: str = PRIMARY_FORM_ID,
    field_name: str | None = None,
    source_type: str = "user_text",
) -> dict:
    get_case_or_404(session, case_id)
    current_field = field_name or _next_missing_field(session, case_id) or "location.zip"
    candidate = _candidate_for_answer(current_field, answer, source_type)
    return _response(
        session,
        case_id,
        language=language,
        form_id=form_id,
        current_field=current_field,
        field_candidate=candidate,
        assistant_message=_confirm_message(language),
        next_action="confirm_field",
    )


def confirm_form_field(
    session: Session,
    case_id: str,
    *,
    form_id: str,
    field_name: str,
    official_label: str | None,
    value: Any,
    source_type: str,
    confidence: float,
    needs_review: bool,
    explanation: str,
    confirmed: bool,
    language: str = "en",
) -> dict:
    get_case_or_404(session, case_id)
    canonical_name = _canonical_name(field_name)
    label = official_label or FIELD_DETAILS.get(canonical_name, {}).get("official_label") or canonical_name
    if not confirmed:
        return _response(
            session,
            case_id,
            language=language,
            form_id=form_id,
            current_field=canonical_name,
            field_candidate=None,
            assistant_message=_not_saved_message(language),
            next_action="ask_question",
        )

    reviewed = needs_review or confidence < 0.75 or canonical_name in HIGH_RISK_FACTS
    fact = upsert_fact(
        session=session,
        case_id=case_id,
        canonical_name=canonical_name,
        value=value,
        source_type=source_type,
        source_ref=f"form_confirm:{form_id}:{canonical_name}",
        confidence=confidence,
        confirmed_by_user=True,
        needs_review=reviewed,
        risk_level=FIELD_MAP.get(canonical_name, ("", "low"))[1],
    )
    field = FormFieldValue(
        case_id=case_id,
        form_id=form_id,
        official_field_label=label,
        canonical_field_name=canonical_name,
        value_json=dumps_json(value),
        source_type=source_type,
        source_ref=f"case_fact:{fact.id}",
        confidence=confidence,
        needs_review=reviewed,
        risk_level=FIELD_MAP.get(canonical_name, ("", "low"))[1],
        explanation_simple=explanation or "Confirmed by the user in CareGuide.",
        user_confirmed=True,
    )
    session.add(field)
    session.commit()
    session.refresh(field)

    next_field = _next_missing_field(session, case_id)
    return _response(
        session,
        case_id,
        language=language,
        form_id=form_id,
        current_field=next_field,
        field_candidate=None,
        assistant_message=_saved_message(language, bool(next_field)),
        next_action="ask_question" if next_field else "continue_section",
    )


def _response(
    session: Session,
    case_id: str,
    *,
    language: str,
    form_id: str,
    current_field: str | None,
    field_candidate: dict | None,
    assistant_message: str,
    next_action: str,
) -> dict:
    detail = FIELD_DETAILS.get(current_field or "", {})
    section = detail.get("section", "Review")
    next_question = _question_payload(current_field, language) if current_field else None
    return {
        "assistant_message": assistant_message,
        "language": language,
        "current_form_id": form_id,
        "current_section": section,
        "next_question": next_question,
        "field_candidate": field_candidate,
        "needs_confirmation": field_candidate is not None,
        "can_continue_to_next_section": current_field is None,
        "missing_documents": document_checklist(session, case_id),
        "safety_flags": [],
        "next_action": next_action,
    }


def document_checklist(session: Session, case_id: str) -> list[dict]:
    settings = get_settings()
    facts = {fact.canonical_name for fact in list_case_facts(session, case_id, confirmed_only=False)}
    rules = load_yaml(settings.resolved_path(settings.RULES_DOCUMENT_PATH)).get("documents", [])
    missing = []
    for rule in rules:
        required_when = set(rule.get("required_when", []))
        if required_when and not required_when.intersection(facts):
            continue
        missing.append(
            {
                "id": rule["id"],
                "title": rule["title"],
                "status": "Needed",
                "explanation": rule.get("why_needed", "This may be requested during review."),
            }
        )
    return missing


def _next_missing_field(session: Session, case_id: str) -> str | None:
    facts = {
        fact.canonical_name: fact
        for fact in list_case_facts(session, case_id, confirmed_only=False)
    }
    for field_name in FIELD_DETAILS:
        fact = facts.get(field_name)
        if not fact or not fact.confirmed_by_user:
            return field_name
    return None


def _question_payload(field_name: str | None, language: str) -> dict | None:
    if not field_name:
        return None
    detail = FIELD_DETAILS[field_name]
    return {
        "field_name": field_name,
        "official_label": detail["official_label"],
        "user_facing_question": SPANISH_QUESTIONS.get(field_name, detail["question"])
        if language == "es"
        else detail["question"],
        "why_needed": SPANISH_WHY.get(field_name, detail["why_needed"])
        if language == "es"
        else detail["why_needed"],
        "answer_type": detail["answer_type"],
    }


def _candidate_for_answer(field_name: str, answer: str, source_type: str) -> dict:
    canonical_name = _canonical_name(field_name)
    detail = FIELD_DETAILS.get(canonical_name, FIELD_DETAILS["location.zip"])
    value, confidence = _normalize_answer(canonical_name, answer)
    needs_review = canonical_name in HIGH_RISK_FACTS or confidence < 0.75
    return {
        "field_name": canonical_name,
        "official_label": detail["official_label"],
        "value": value,
        "source_type": source_type,
        "confidence": confidence,
        "needs_review": needs_review,
        "explanation": "Prepared from the user's answer and waiting for confirmation.",
    }


def _normalize_answer(field_name: str, answer: str) -> tuple[Any, float]:
    cleaned = answer.strip()
    lower = cleaned.lower()
    if field_name in {"household.size", "income.estimate"}:
        digits = "".join(char for char in cleaned if char.isdigit())
        if digits:
            return int(digits), 0.86
        return cleaned, 0.6
    if field_name == "insurance.recent_coverage_loss":
        if lower in {"yes", "y", "si", "sí"}:
            return True, 0.88
        if lower in {"no", "n"}:
            return False, 0.88
        return cleaned, 0.62
    if field_name == "employer.coverage_offer":
        if "yes" in lower or "sí" in lower or "si" == lower:
            return "yes", 0.84
        if "no" == lower or " no " in f" {lower} ":
            return "no", 0.84
        if "not sure" in lower or "unknown" in lower or "no se" in lower or "no sé" in lower:
            return "unknown", 0.8
        return cleaned, 0.62
    if field_name == "income.frequency":
        if "month" in lower or "mensual" in lower or "mes" in lower:
            return "monthly", 0.86
        if "week" in lower or "semana" in lower:
            return "weekly", 0.82
        if "year" in lower or "annual" in lower or "año" in lower:
            return "yearly", 0.82
        return cleaned, 0.68
    return cleaned, 0.88 if cleaned else 0.0


def _canonical_name(field_name: str) -> str:
    aliases = {
        "zip": "location.zip",
        "householdSize": "household.size",
        "incomeEstimate": "income.estimate",
        "incomeFrequency": "income.frequency",
        "employerCoverageOffer": "employer.coverage_offer",
    }
    return aliases.get(field_name, field_name)


def _ask_message(language: str) -> str:
    if language == "es":
        return "Puedo ayudarle con este formulario paso a paso. Haré una pregunta a la vez."
    return "I can help you fill this form step by step. I’ll ask one question at a time."


def _confirm_message(language: str) -> str:
    if language == "es":
        return "Revise la respuesta propuesta antes de guardarla."
    return "Review the proposed answer before I save it."


def _saved_message(language: str, has_next: bool) -> str:
    if language == "es":
        return "Guardé esa respuesta. Continuemos con la siguiente pregunta." if has_next else "Esta sección está lista para revisión."
    return "I saved that answer. Let’s continue to the next question." if has_next else "This section looks ready for review."


def _not_saved_message(language: str) -> str:
    if language == "es":
        return "No guardé esa respuesta. Puede editarla o responder de nuevo."
    return "I did not save that answer. You can edit it or answer again."


def _ready_message(language: str) -> str:
    if language == "es":
        return "Esta sección está lista para revisión. Puede continuar o pedirme que explique algo."
    return "This section looks ready for review. You can continue or ask me to explain anything."
