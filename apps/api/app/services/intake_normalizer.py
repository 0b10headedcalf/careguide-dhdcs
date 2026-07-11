import re
from typing import Any

from app.core.constants import HIGH_RISK_FACTS


ZIP_RE = re.compile(r"\b(\d{5})(?:-\d{4})?\b")
MONEY_RE = re.compile(r"\$?\s?(\d{2,6})(?:[,.]\d{3})?")

# Household size — matches either English "household has/of/is N" or the common
# Spanish framings. Accented characters and their bare-ASCII forms both work
# because users often type without diacritics.
HOUSEHOLD_EN_RE = re.compile(r"\bhousehold (?:has|of|is)\s+(\d{1,2})\b")
HOUSEHOLD_ES_RE = re.compile(
    r"\b(?:hogar\s+de|familia\s+de|somos\s+(?:una\s+)?)?(\d{1,2})\s+"
    r"(?:personas|en\s+(?:mi|la)\s+(?:hogar|casa|familia))\b"
)
HOUSEHOLD_ES_ALT_RE = re.compile(r"\b(?:hogar|familia)\s+de\s+(\d{1,2})\b")

# Lost-coverage signals in either language.
LOST_EN_TOKENS = ("lost",)
LOST_ES_TOKENS = ("perdi", "perdí", "quedé sin", "quede sin")
INSURANCE_EN_TOKENS = ("insurance", "coverage")
INSURANCE_ES_TOKENS = ("seguro", "cobertura", "aseguranza")

# Uninsured / no coverage signals.
UNINSURED_EN_PHRASES = ("no insurance", "uninsured", "without insurance", "without coverage")
UNINSURED_ES_PHRASES = (
    "sin seguro",
    "sin cobertura",
    "sin aseguranza",
    "no tengo seguro",
    "no tengo cobertura",
    "no tengo aseguranza",
)

# Explicit coverage-need signals.
NEED_COVERAGE_EN_PHRASES = (
    "need insurance",
    "need coverage",
    "need health insurance",
    "looking for insurance",
    "looking for coverage",
    "help getting insurance",
    "help getting coverage",
)
NEED_COVERAGE_ES_PHRASES = (
    "necesito seguro",
    "necesito cobertura",
    "necesito aseguranza",
    "busco seguro",
    "busco cobertura",
    "ayuda con seguro",
    "ayuda con cobertura",
)

# Income frequency.
MONTHLY_EN_PHRASES = ("monthly", "per month", "a month")
MONTHLY_ES_PHRASES = ("mensual", "por mes", "al mes", "cada mes")

# Income-context tokens so we don't mis-fire on random 4-digit numbers.
INCOME_CONTEXT_EN_TOKENS = ("income", "earn", "salary", "wages", "make", "monthly")
INCOME_CONTEXT_ES_TOKENS = ("ingreso", "gano", "sueldo", "salario", "cobro", "mensual")

# Employer coverage.
EMPLOYER_EN_TOKENS = ("employer", "job", "work")
EMPLOYER_ES_TOKENS = ("empleador", "empleo", "trabajo", "patrón", "patron")
EMPLOYER_YES_EN_PHRASES = ("yes", "through a job", "at work", "from my job")
EMPLOYER_YES_ES_PHRASES = ("sí", "si tengo", "por mi trabajo", "en el trabajo", "de mi empleador")


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


def _any_in(text: str, needles: tuple[str, ...]) -> bool:
    return any(needle in text for needle in needles)


def deterministic_case_delta(message: str, message_id: str) -> list[dict[str, Any]]:
    text = message.lower()
    suggestions: list[dict[str, Any]] = []

    zip_match = ZIP_RE.search(message)
    if zip_match:
        suggestions.append(_suggest("location.zip", zip_match.group(1), message_id, 0.98, "The message included a ZIP code."))

    lost_signal = _any_in(text, LOST_EN_TOKENS) or _any_in(text, LOST_ES_TOKENS)
    insurance_signal = _any_in(text, INSURANCE_EN_TOKENS) or _any_in(text, INSURANCE_ES_TOKENS)
    if lost_signal and insurance_signal:
        suggestions.append(_suggest("insurance.recent_coverage_loss", True, message_id, 0.9, "The user said they lost coverage."))
        suggestions.append(_suggest("insurance.needs_health_coverage", True, message_id, 0.88, "A coverage loss suggests the user may need health coverage."))

    if _any_in(text, UNINSURED_EN_PHRASES) or _any_in(text, UNINSURED_ES_PHRASES):
        suggestions.append(_suggest("insurance.current_status", "uninsured", message_id, 0.86, "The user indicated they do not currently have insurance."))
        suggestions.append(_suggest("insurance.needs_health_coverage", True, message_id, 0.86, "The user indicated they need coverage."))

    if _any_in(text, NEED_COVERAGE_EN_PHRASES) or _any_in(text, NEED_COVERAGE_ES_PHRASES):
        suggestions.append(_suggest("insurance.needs_health_coverage", True, message_id, 0.9, "The user directly asked for help getting coverage."))

    household_match = (
        HOUSEHOLD_EN_RE.search(text)
        or HOUSEHOLD_ES_ALT_RE.search(text)
        or HOUSEHOLD_ES_RE.search(text)
    )
    if household_match:
        suggestions.append(_suggest("household.size", int(household_match.group(1)), message_id, 0.82, "The user stated a household size."))

    monthly_signal = _any_in(text, MONTHLY_EN_PHRASES) or _any_in(text, MONTHLY_ES_PHRASES)
    if monthly_signal:
        suggestions.append(_suggest("income.frequency", "monthly", message_id, 0.74, "The user referenced monthly income."))

    money_match = MONEY_RE.search(message)
    income_context = (
        _any_in(text, INCOME_CONTEXT_EN_TOKENS)
        or _any_in(text, INCOME_CONTEXT_ES_TOKENS)
        or monthly_signal
    )
    if money_match and income_context:
        suggestions.append(_suggest("income.estimate", int(money_match.group(1).replace(",", "")), message_id, 0.72, "The user provided an income amount."))

    if _any_in(text, EMPLOYER_EN_TOKENS) or _any_in(text, EMPLOYER_ES_TOKENS):
        yes_signal = _any_in(text, EMPLOYER_YES_EN_PHRASES) or _any_in(text, EMPLOYER_YES_ES_PHRASES)
        value = "yes" if yes_signal else "unknown"
        suggestions.append(_suggest("employer.coverage_offer", value, message_id, 0.7, "The user referenced employer coverage."))

    if "definitely qualify" in text or "you are eligible" in text or "definitivamente califico" in text:
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
