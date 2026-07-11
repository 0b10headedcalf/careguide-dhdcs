from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.core.config import get_settings
from app.models.form import FormRoute
from app.rules.loader import load_json, load_yaml
from app.services.case_service import facts_as_dict, latest_pathway
from app.services.eligibility_engine import _evaluate_clause
from app.utils.dates import utc_now


def route_forms_for_case(session: Session, case_id: str) -> list[dict]:
    settings = get_settings()
    facts = facts_as_dict(session, case_id, confirmed_only=True)
    pathway = latest_pathway(session, case_id)
    if pathway:
        facts["pathway"] = pathway.pathway
    rules = load_yaml(settings.resolved_path(settings.RULES_FORM_ROUTES_PATH)).get("rules", [])
    catalog = {item["form_id"]: item for item in load_json(settings.resolved_path(settings.FORM_CATALOG_PATH))}

    triggered: list[dict] = []
    for rule in rules:
        if not _evaluate_clause(rule.get("when", {}), facts):
            continue
        form = catalog.get(rule["form_id"])
        if not form:
            continue
        route = _persist_route(session, case_id, rule, form)
        triggered.append(
            {
                "form_id": route.form_id,
                "name": route.form_name,
                "reason": route.route_reason,
                "official_url": route.official_url,
                "source_id": route.source_id,
                "retrieved_at": route.retrieved_at.isoformat(),
                "status": route.status,
            }
        )
    return triggered


def _persist_route(session: Session, case_id: str, rule: dict, form: dict) -> FormRoute:
    existing = session.exec(
        select(FormRoute).where(FormRoute.case_id == case_id).where(FormRoute.form_id == form["form_id"])
    ).first()
    retrieved_at = _parse_datetime(form.get("last_verified_at")) or utc_now()
    if existing:
        return existing
    route = FormRoute(
        case_id=case_id,
        form_id=form["form_id"],
        form_name=form["name"],
        official_url=form["official_url"],
        route_reason=rule["reason"],
        rule_id=rule["id"],
        source_id=form["source_id"],
        retrieved_at=retrieved_at,
        status="suggested",
    )
    session.add(route)
    session.commit()
    session.refresh(route)
    return route


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

