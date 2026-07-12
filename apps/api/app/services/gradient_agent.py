import json
import logging
from typing import Any

import httpx
from pydantic import ValidationError
from sqlmodel import Session

from app.adapters.digitalocean_gradient import _extract_json_object
from app.core.config import get_settings
from app.schemas.agent import AgentMessageData
from app.services.case_service import case_detail, facts_as_dict, generate_action_plan
from app.services.document_service import list_documents
from app.services.intake_normalizer import next_question


SYSTEM_INSTRUCTIONS = """You are CareGuide Coverage Orchestrator, a California benefits form copilot.
Use the attached CareGuide knowledge base. Ask one relevant question at a time. Explain forms in
the requested language and detail level. Never say the user qualifies, never claim submission,
and call every coverage result a likely pathway. Do not invent resources or document facts.
Return ONLY a JSON object, no prose outside it, exactly this shape:
{"assistant_message": "<string>", "next_question": "<string or null>",
"suggested_case_updates": [{"canonical_name": "<string>", "suggested_value": <any>,
"source_type": "agent_suggestion", "confidence": <0-1>, "needs_review": <bool>,
"explanation": "<string>"}], "form_field_candidates": [{"field_name": "<string>",
"official_label": "<string>", "value": <any>, "source_type": "agent_suggestion",
"confidence": <0-1>, "needs_review": <bool>, "explanation": "<string>"}],
"needs_confirmation": <bool>, "safety_flags": ["<string>"], "next_action": "<string>"}
suggested_case_updates, form_field_candidates, and safety_flags MUST be JSON arrays (use []
when empty); needs_confirmation MUST be a boolean. Never mutate the case or treat document
text as confirmed."""


def _normalize_agent_payload(parsed: dict) -> dict:
    """Agents drift from the contract (dicts for lists, lists for bools).
    Coerce the common drifts instead of discarding an otherwise good answer."""
    for key in ("suggested_case_updates", "form_field_candidates"):
        value = parsed.get(key)
        if isinstance(value, dict):
            parsed[key] = [
                {"canonical_name": name, "suggested_value": item}
                if not isinstance(item, dict)
                else {"canonical_name": name, **item}
                for name, item in value.items()
            ]
        elif not isinstance(value, list):
            parsed[key] = []
        parsed[key] = [item for item in parsed[key] if isinstance(item, dict)]
    flags = parsed.get("safety_flags")
    if isinstance(flags, str):
        parsed["safety_flags"] = [flags]
    elif not isinstance(flags, list):
        parsed["safety_flags"] = []
    needs = parsed.get("needs_confirmation")
    if not isinstance(needs, bool):
        parsed["needs_confirmation"] = bool(needs)
    question = parsed.get("next_question")
    if isinstance(question, dict):
        parsed["next_question"] = question.get("user_facing_question") or json.dumps(question)
    if not isinstance(parsed.get("assistant_message"), str):
        parsed["assistant_message"] = str(parsed.get("assistant_message") or "")
    if not isinstance(parsed.get("next_action"), str):
        parsed.pop("next_action", None)
    return parsed


def _fallback(session: Session, case_id: str, language: str, message: str) -> dict:
    facts = facts_as_dict(session, case_id, confirmed_only=True)
    question = next_question(facts, language)
    if language == "es":
        assistant = (
            "El asistente de formularios no está disponible ahora. Sus respuestas guardadas "
            "siguen seguras. Puede continuar con la siguiente pregunta."
        )
    else:
        assistant = (
            "The form assistant is unavailable right now. Your saved answers are still safe. "
            "You can continue with the next question."
        )
    return AgentMessageData(
        assistant_message=assistant,
        next_question=question,
        next_action=generate_action_plan(session, case_id)["next_action"],
        safety_flags=["agent_unavailable"],
        agent_available=False,
    ).model_dump()


def _case_context(
    session: Session,
    case_id: str,
    language: str,
    explanation_level: str,
    form_id: str | None,
) -> dict:
    detail = case_detail(session, case_id)
    return {
        "preferred_language": language,
        "explanation_level": explanation_level,
        "case_status": detail["status"],
        "current_form_id": form_id,
        "known_answers": [
            {
                "canonical_name": fact["canonical_name"],
                "value": fact["value"],
                "source_type": fact["source_type"],
                "confirmed_by_user": fact["confirmed_by_user"],
            }
            for fact in detail["facts"]
        ],
        "triggered_forms": detail["triggered_forms"],
        "verification_flags": detail["verification_flags"],
        "uploaded_documents": [
            {
                "document_type": document["document_type"],
                "extraction_status": document["extraction_status"],
                "extracted_text_preview": document["extracted_text_preview"],
                "confirmed_by_user": document["confirmed_by_user"],
            }
            for document in list_documents(session, case_id)
        ],
    }


async def call_gradient_agent(
    session: Session,
    *,
    case_id: str,
    message: str,
    language: str,
    explanation_level: str,
    form_id: str | None,
    debug: bool = False,
) -> dict:
    settings = get_settings()
    endpoint = settings.GRADIENT_AGENT_ENDPOINT.rstrip("/")
    access_key = settings.GRADIENT_AGENT_ACCESS_KEY
    if not endpoint or not access_key:
        return _fallback(session, case_id, language, message)

    context = _case_context(session, case_id, language, explanation_level, form_id)
    # DO Gradient agent endpoints reject system/developer roles (agent
    # instructions live in the agent's console config), so the response
    # contract rides along inside the single user message.
    payload = {
        "messages": [
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "response_contract": SYSTEM_INSTRUCTIONS,
                        "case_context": context,
                        "user_message": message,
                    }
                ),
            },
        ],
        "stream": False,
        "include_retrieval_info": debug,
        "include_functions_info": debug,
        "include_guardrails_info": debug,
    }
    try:
        # The agent (Claude with retrieval) routinely takes 30s+ to answer;
        # a short read timeout silently degrades every reply to the fallback.
        async with httpx.AsyncClient(timeout=httpx.Timeout(90, connect=10)) as client:
            response = await client.post(
                f"{endpoint}/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {access_key}", "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            raw = response.json()
        content = raw["choices"][0]["message"]["content"]
        if isinstance(content, str):
            parsed = _extract_json_object(content)
            if parsed is None:
                # The agent answered in prose instead of the JSON contract.
                # A real answer in the wrong shape still beats the canned
                # "assistant unavailable" fallback.
                parsed = {
                    "assistant_message": content.strip(),
                    "next_question": next_question(
                        facts_as_dict(session, case_id, confirmed_only=True), language
                    ),
                    "next_action": generate_action_plan(session, case_id)["next_action"],
                }
        else:
            parsed = content
        parsed = _normalize_agent_payload(parsed)
        parsed.setdefault("assistant_message", "")
        parsed.setdefault(
            "next_action", generate_action_plan(session, case_id)["next_action"]
        )
        parsed["agent_available"] = True
        parsed["metadata"] = (
            {key: raw.get(key) for key in ("retrieval", "functions", "guardrails") if raw.get(key)}
            if debug and settings.APP_ENV != "production"
            else None
        )
        return AgentMessageData.model_validate(parsed).model_dump()
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as exc:
        logging.getLogger("carebridge.agent").warning(
            "gradient agent fallback: %s: %s", type(exc).__name__, exc
        )
        return _fallback(session, case_id, language, message)
