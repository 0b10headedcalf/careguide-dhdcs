import re
from typing import Any

from app.core.constants import HIGH_RISK_FACTS


ZIP_RE = re.compile(r"\b(\d{5})(?:-\d{4})?\b")
MONEY_RE = re.compile(r"\$?\s?(\d{2,6})(?:[,.]\d{3})?")


NEXT_QUESTIONS_EN = [
    ("location.zip", "What ZIP code do you live in?"),
    ("household.size", "How many people are in your household?"),
    ("income.estimate", "What is your approximate household income?"),
    ("income.frequency", "How often do you receive that income?"),
    ("employer.coverage_offer", "Are you offered health insurance through an employer?"),
]
NEXT_QUESTIONS_ES = [
    ("location.zip", "¿Cuál es su código postal?"),
    ("household.size", "¿Cuántas personas hay en su hogar?"),
    ("income.estimate", "¿Cuál es el ingreso aproximado de su hogar?"),
    ("income.frequency", "¿Con qué frecuencia recibe ese ingreso?"),
    ("employer.coverage_offer", "¿Le ofrecen seguro médico por medio de un empleador?"),
]


def deterministic_case_delta(message: str, message_id: str) -> list[dict[str, Any]]:
    text = message.lower()
    suggestions: list[dict[str, Any]] = []

    zip_match = ZIP_RE.search(message)
    if zip_match:
        suggestions.append(_suggest("location.zip", zip_match.group(1), message_id, 0.98, "The message included a ZIP code."))

    if "lost" in text and ("insurance" in text or "coverage" in text):
        suggestions.append(_suggest("insurance.recent_coverage_loss", True, message_id, 0.9, "The user said they lost coverage."))
        suggestions.append(_suggest("insurance.needs_health_coverage", True, message_id, 0.88, "A coverage loss suggests the user may need health coverage."))

    if "no insurance" in text or "uninsured" in text:
        suggestions.append(_suggest("insurance.current_status", "uninsured", message_id, 0.86, "The user indicated they do not currently have insurance."))
        suggestions.append(_suggest("insurance.needs_health_coverage", True, message_id, 0.86, "The user indicated they need coverage."))

    household_match = re.search(r"\bhousehold (?:has|of|is)\s+(\d{1,2})\b", text)
    if household_match:
        suggestions.append(_suggest("household.size", int(household_match.group(1)), message_id, 0.82, "The user stated a household size."))

    if "monthly" in text or "per month" in text:
        suggestions.append(_suggest("income.frequency", "monthly", message_id, 0.74, "The user referenced monthly income."))

    money_match = MONEY_RE.search(message)
    if money_match and ("income" in text or "earn" in text or "monthly" in text):
        suggestions.append(_suggest("income.estimate", int(money_match.group(1).replace(",", "")), message_id, 0.72, "The user provided an income amount."))

    if "employer" in text or "job" in text:
        value = "yes" if "yes" in text or "through a job" in text else "unknown"
        suggestions.append(_suggest("employer.coverage_offer", value, message_id, 0.7, "The user referenced employer coverage."))

    if "definitely qualify" in text or "you are eligible" in text:
        suggestions.append(_suggest("safety.user_requested_forbidden_eligibility_language", True, message_id, 1.0, "The user requested language CareBridge CA must not provide."))

    return suggestions


def _suggest(canonical_name: str, value: Any, message_id: str, confidence: float, explanation: str) -> dict[str, Any]:
    return {
        "canonical_name": canonical_name,
        "suggested_value": value,
        "source_type": "agent_suggestion",
        "source_ref": f"intake_message:{message_id}",
        "confidence": confidence,
        "needs_review": canonical_name in HIGH_RISK_FACTS,
        "explanation_simple": explanation,
    }


def next_question(existing_facts: dict[str, Any], language: str = "en") -> str:
    questions = NEXT_QUESTIONS_ES if language == "es" else NEXT_QUESTIONS_EN
    for canonical_name, question in questions:
        if canonical_name not in existing_facts:
            return question
    return "Would you like help finding care while your coverage is being reviewed?" if language == "en" else "¿Desea ayuda para encontrar atención mientras revisan su cobertura?"

