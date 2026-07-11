"""Redaction tests.

Locks in that PII patterns are stripped before any intake message is persisted
or logged. Safety-critical.
"""
from app.utils.redaction import redact_payload, redact_text


def test_ssn_dashed_is_redacted():
    assert "[REDACTED_SSN]" in redact_text("my ssn is 123-45-6789")
    assert "123-45-6789" not in redact_text("my ssn is 123-45-6789")


def test_ssn_run_together_is_redacted():
    assert "[REDACTED_SSN]" in redact_text("SSN 123456789")


def test_a_number_digits_are_redacted():
    text = "my a-number is A123456789"
    redacted = redact_text(text)
    assert "123456789" not in redacted
    assert "[REDACTED" in redacted


def test_api_key_line_is_redacted():
    text = "authorization: sk-live-abc123def456"
    redacted = redact_text(text)
    assert "sk-live-abc123def456" not in redacted
    assert "[REDACTED_SECRET]" in redacted


def test_ordinary_text_survives_untouched():
    text = "I lost my job in March and need coverage."
    assert redact_text(text) == text


def test_short_numbers_survive():
    # ZIP codes, ages, household sizes should not be redacted.
    text = "I live in 94110 with 3 people in my household."
    redacted = redact_text(text)
    assert "94110" in redacted
    assert "3" in redacted


def test_payload_redacts_string_values_only():
    payload = {
        "message": "SSN 123-45-6789",
        "household_size": 4,
        "language": "en",
    }
    out = redact_payload(payload)
    assert "[REDACTED_SSN]" in out["message"]
    assert out["household_size"] == 4
    assert out["language"] == "en"
