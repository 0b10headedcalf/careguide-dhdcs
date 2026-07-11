from typing import Any

from sqlmodel import Session

from app.core.config import get_settings
from app.core.constants import AUTO_CONFIRM_MIN_CONFIDENCE, HIGH_RISK_FACTS
from app.models.intake import IntakeMessage
from app.services.audit_service import append_audit_event
from app.services.case_service import facts_as_dict, get_case_or_404, upsert_fact
from app.services.intake_normalizer import next_question
from app.services.llm_gateway import LLMGateway
from app.utils.redaction import redact_text


async def submit_intake_message(
    session: Session,
    case_id: str,
    message: str,
    language: str,
    input_mode: str,
) -> dict:
    settings = get_settings()
    case = get_case_or_404(session, case_id)
    redacted = redact_text(message)
    intake_message = IntakeMessage(
        case_id=case.id,
        role="user",
        language=language,
        redacted_content=redacted,
        raw_content_encrypted_or_null=message if settings.STORE_RAW_INTAKE_MESSAGES else None,
    )
    session.add(intake_message)
    case.status = "intake_in_progress"
    session.add(case)
    session.commit()
    session.refresh(intake_message)

    # DO Gradient agent parses the message; falls back to the deterministic
    # normalizer inside the gateway when the agent is unconfigured or fails.
    suggestions = await LLMGateway().extract_case_delta(message, intake_message.id)
    auto_confirmed_names: list[str] = []
    for suggestion in suggestions:
        if _should_auto_confirm(suggestion):
            upsert_fact(
                session=session,
                case_id=case.id,
                canonical_name=suggestion["canonical_name"],
                value=suggestion["suggested_value"],
                source_type="agent_auto_confirmed",
                source_ref=suggestion["source_ref"],
                confidence=suggestion["confidence"],
                confirmed_by_user=True,
                needs_review=False,
                risk_level="low",
            )
            suggestion["auto_confirmed"] = True
            auto_confirmed_names.append(suggestion["canonical_name"])
        else:
            suggestion.setdefault("auto_confirmed", False)

    existing = facts_as_dict(session, case_id, confirmed_only=True)
    warnings = _safety_warnings(message)
    return {
        "case_delta": suggestions,
        "next_question": next_question(existing, language=language),
        "confirmation_needed": any(item["needs_review"] for item in suggestions),
        "warnings": warnings,
        "progress": {"input_mode": input_mode, "suggestions": len(suggestions)},
        "auto_confirmed_facts": auto_confirmed_names,
    }


def _should_auto_confirm(suggestion: dict) -> bool:
    if suggestion.get("needs_review"):
        return False
    if suggestion["canonical_name"] in HIGH_RISK_FACTS:
        return False
    return suggestion.get("confidence", 0.0) >= AUTO_CONFIRM_MIN_CONFIDENCE


def confirm_case_fact(
    session: Session,
    case_id: str,
    canonical_name: str,
    value: Any,
    confirmed: bool,
) -> dict:
    case = get_case_or_404(session, case_id)
    fact = None
    if confirmed:
        risk = "high" if canonical_name in HIGH_RISK_FACTS else "low"
        fact = upsert_fact(
            session=session,
            case_id=case.id,
            canonical_name=canonical_name,
            value=value,
            source_type="user",
            source_ref="intake_confirm",
            confidence=1.0,
            confirmed_by_user=True,
            needs_review=False,
            risk_level=risk,
        )
        if case.status == "intake_in_progress":
            case.status = "intake_complete"
            session.add(case)
            session.commit()
    append_audit_event(
        session,
        event_type="case_fact_confirmation",
        actor_type="user",
        case_id=case_id,
        payload={"canonical_name": canonical_name, "confirmed": confirmed},
    )
    return {"case_id": case_id, "canonical_name": canonical_name, "confirmed": confirmed, "fact_id": fact.id if fact else None}


def _safety_warnings(message: str) -> list[str]:
    text = message.lower()
    warnings = []
    if "definitely qualify" in text or "you are eligible" in text or "you qualify" in text:
        warnings.append("CareBridge CA can provide a likely pathway only; official eligibility decisions are made by the state or county.")
    if "immigration category" in text:
        warnings.append("CareBridge CA cannot interpret immigration law. A trained human reviewer should help.")
    if "make up" in text and "clinic" in text:
        warnings.append("CareBridge CA will not invent resources. It only returns verified source results.")
    if "sign" in text:
        warnings.append("CareBridge CA cannot create or apply a signature.")
    if "medical advice" in text:
        warnings.append("CareBridge CA cannot provide diagnosis or treatment advice.")
    return warnings

