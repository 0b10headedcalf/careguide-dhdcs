import re


SSN_RE = re.compile(r"\b\d{3}-?\d{2}-?\d{4}\b")
LONG_NUMBER_RE = re.compile(r"\b\d{9,}\b")
API_KEY_RE = re.compile(r"(?i)(api[_-]?key|authorization|token|secret)\s*[:=]\s*[\w\-\.]+")


def redact_text(value: str) -> str:
    redacted = SSN_RE.sub("[REDACTED_SSN]", value)
    redacted = LONG_NUMBER_RE.sub("[REDACTED_NUMBER]", redacted)
    return API_KEY_RE.sub(r"\1=[REDACTED_SECRET]", redacted)


def redact_payload(payload: dict) -> dict:
    return {key: redact_text(str(value)) if isinstance(value, str) else value for key, value in payload.items()}

