from sqlmodel import Session

from app.core.constants import HIGH_RISK_FACTS
from app.services.case_service import list_case_facts
from app.services.field_mapper import FIELD_MAP


def verify_packet(session: Session, case_id: str, form_id: str) -> dict:
    facts = {fact.canonical_name: fact for fact in list_case_facts(session, case_id, confirmed_only=False)}
    blocking_flags: list[str] = []
    warnings: list[str] = []
    for canonical_name in FIELD_MAP:
        fact = facts.get(canonical_name)
        if not fact:
            warnings.append(f"Missing {canonical_name}.")
            continue
        if canonical_name in HIGH_RISK_FACTS and not fact.confirmed_by_user:
            blocking_flags.append(f"{canonical_name} must be confirmed by the user.")
        if fact.source_type == "agent_suggestion" and not fact.confirmed_by_user:
            blocking_flags.append(f"{canonical_name} is an unconfirmed agent suggestion.")
        if not fact.source_ref:
            blocking_flags.append(f"{canonical_name} is missing provenance.")
    if "signature" in facts:
        blocking_flags.append("CareBridge CA cannot create or apply a signature.")
    if "authorized_representative.appointment" in facts:
        blocking_flags.append("CareBridge CA cannot appoint itself as an authorized representative.")
    return {
        "blocking_flags": blocking_flags,
        "warnings": warnings,
        "ready_for_handoff": not blocking_flags,
    }

