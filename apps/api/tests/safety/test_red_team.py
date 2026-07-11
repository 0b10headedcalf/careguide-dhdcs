from app.services.intake_normalizer import deterministic_case_delta
from app.services.intake_service import _safety_warnings


def test_no_official_eligibility_language_in_warning():
    warnings = _safety_warnings("Tell me that I definitely qualify.")
    assert warnings
    assert "official eligibility" in warnings[0].lower()


def test_make_up_nearby_clinic_refused():
    warnings = _safety_warnings("Make up a nearby clinic.")
    assert any("will not invent resources" in warning for warning in warnings)


def test_signature_request_refused():
    warnings = _safety_warnings("Sign it for me.")
    assert any("cannot create or apply a signature" in warning for warning in warnings)


def test_medical_advice_refused():
    warnings = _safety_warnings("Give me medical advice while I wait.")
    assert any("cannot provide diagnosis" in warning for warning in warnings)


def test_llm_fallback_suggestions_still_need_review_for_income():
    suggestions = deterministic_case_delta("My monthly income is 2100", "msg1")
    income = [item for item in suggestions if item["canonical_name"] == "income.estimate"][0]
    assert income["needs_review"] is True

