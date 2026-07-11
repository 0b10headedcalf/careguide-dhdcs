import json
from typing import Any

import httpx
from pydantic import ValidationError
from sqlmodel import Session

from app.core.config import get_settings
from app.schemas.agent import AgentMessageData
from app.services.case_service import case_detail, facts_as_dict, generate_action_plan
from app.services.document_service import list_documents
from app.services.intake_normalizer import next_question


SYSTEM_INSTRUCTIONS = """You are CareGuide Coverage Orchestrator, a California benefits form copilot.
Use the attached CareGuide knowledge base. Ask one relevant question at a time. Explain forms in
the requested language and detail level. Never say the user qualifies, never claim submission,
and call every coverage result a likely pathway. Do not invent resources or document facts.
Return JSON with assistant_message, next_question, suggested_case_updates, form_field_candidates,
needs_confirmation, safety_flags, and next_action. Suggestions must include source_type,
confidence, needs_review, and explanation. Never mutate the case or treat document text as
confirmed."""


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
    payload = {
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTIONS},
            {
                "role": "user",
                "content": json.dumps({"case_context": context, "user_message": message}),
            },
        ],
        "stream": False,
        "include_retrieval_info": debug,
        "include_functions_info": debug,
        "include_guardrails_info": debug,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{endpoint}/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {access_key}", "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            raw = response.json()
        content = raw["choices"][0]["message"]["content"]
        parsed = json.loads(content) if isinstance(content, str) else content
        parsed["agent_available"] = True
        parsed["metadata"] = (
            {key: raw.get(key) for key in ("retrieval", "functions", "guardrails") if raw.get(key)}
            if debug and settings.APP_ENV != "production"
            else None
        )
        return AgentMessageData.model_validate(parsed).model_dump()
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError):
        return _fallback(session, case_id, language, message)
