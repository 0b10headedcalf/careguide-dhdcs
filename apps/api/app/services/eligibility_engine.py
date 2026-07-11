from typing import Any

from sqlmodel import Session

from app.core.config import get_settings
from app.models.pathway import PathwayResult
from app.rules.loader import load_yaml
from app.services.case_service import facts_as_dict, get_case_or_404
from app.services.fpl import pct_of_fpl
from app.utils.json import dumps_json


def evaluate_case_pathway(session: Session, case_id: str) -> dict:
    case = get_case_or_404(session, case_id)
    facts = facts_as_dict(session, case_id, confirmed_only=True)
    settings = get_settings()
    rules = load_yaml(settings.resolved_path(settings.RULES_ELIGIBILITY_PATH)).get("rules", [])

    selected_rule = None
    for rule in rules:
        if _evaluate_clause(rule.get("when", {}), facts):
            selected_rule = rule
            break
    if selected_rule is None and rules:
        selected_rule = rules[-1]

    outcome = (selected_rule or {}).get("outcome", {})
    pathway = outcome.get("pathway", "human_review")
    result = PathwayResult(
        case_id=case_id,
        pathway=pathway,
        rule_ids_json=dumps_json([selected_rule["id"]] if selected_rule else []),
        explanation_simple=outcome.get("explanation_simple", "More information is needed for a likely pathway."),
        missing_questions_json=dumps_json(outcome.get("missing_questions", [])),
        verification_flags_json=dumps_json(outcome.get("verification_flags", [])),
        human_review_required=outcome.get("human_review_required", True),
    )
    session.add(result)
    case.status = "pathway_ready"
    session.add(case)
    session.commit()
    session.refresh(result)
    return {
        "likely_pathway": result.pathway,
        "supported_by_current_answers": bool(facts),
        "human_review_required": result.human_review_required,
        "explanation_simple": result.explanation_simple,
        "missing_questions": outcome.get("missing_questions", []),
        "verification_flags": outcome.get("verification_flags", []),
        "conflicting_information": [],
        "triggered_rule_ids": [selected_rule["id"]] if selected_rule else [],
        "next_best_action": outcome.get("next_best_action", "Continue intake."),
    }


def _evaluate_clause(clause: dict, facts: dict[str, Any]) -> bool:
    if "all" in clause:
        return all(_evaluate_clause(item, facts) for item in clause["all"])
    if "any" in clause:
        return any(_evaluate_clause(item, facts) for item in clause["any"])
    field = clause.get("field")
    operator = clause.get("operator")
    expected = clause.get("value")
    actual = facts.get(field)
    if operator == "equals":
        return actual == expected
    if operator == "not_equals":
        return actual != expected
    if operator == "in":
        return actual in expected
    if operator == "not_in":
        return actual not in expected
    if operator == "exists":
        return field in facts and actual is not None
    if operator == "missing":
        return field not in facts or actual is None
    if operator == "greater_than":
        return actual is not None and actual > expected
    if operator == "less_than":
        return actual is not None and actual < expected
    if operator in ("less_than_pct_fpl", "greater_than_pct_fpl", "between_pct_fpl"):
        pct = pct_of_fpl(
            facts.get("income.estimate"),
            facts.get("income.frequency"),
            facts.get("household.size"),
        )
        if pct is None:
            return False
        if operator == "less_than_pct_fpl":
            return pct < expected
        if operator == "greater_than_pct_fpl":
            return pct > expected
        # between_pct_fpl: expected is [min_inclusive, max_exclusive]
        if isinstance(expected, list) and len(expected) == 2:
            return expected[0] <= pct < expected[1]
        return False
    return False

