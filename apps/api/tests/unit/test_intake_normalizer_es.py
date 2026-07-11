"""Spanish intake normalizer coverage.

Locks in that the deterministic normalizer produces the same canonical
suggestions when the user speaks Spanish. Previously it only matched
English tokens, so a Spanish intake would produce zero facts.
"""
from app.services.intake_normalizer import deterministic_case_delta


def _canonical_names(message: str) -> list[str]:
    return [s["canonical_name"] for s in deterministic_case_delta(message, "test-msg")]


def _fact(message: str, canonical_name: str):
    for suggestion in deterministic_case_delta(message, "test-msg"):
        if suggestion["canonical_name"] == canonical_name:
            return suggestion
    return None


def test_es_sin_seguro_captures_uninsured_and_need_coverage():
    names = _canonical_names("Estoy sin seguro y vivo en 94110")
    assert "insurance.current_status" in names
    assert "insurance.needs_health_coverage" in names
    assert "location.zip" in names


def test_es_perdi_mi_seguro_captures_recent_coverage_loss():
    names = _canonical_names("Perdí mi seguro el mes pasado y necesito ayuda")
    assert "insurance.recent_coverage_loss" in names
    assert "insurance.needs_health_coverage" in names


def test_es_perdi_no_accent_still_matches():
    # Users commonly type without accented characters.
    names = _canonical_names("perdi mi cobertura y no se que hacer")
    assert "insurance.recent_coverage_loss" in names


def test_es_necesito_seguro_captures_need_coverage():
    names = _canonical_names("Necesito seguro para mi familia")
    assert "insurance.needs_health_coverage" in names


def test_es_familia_de_captures_household_size():
    fact = _fact("Somos una familia de 4 personas", "household.size")
    assert fact is not None
    assert fact["suggested_value"] == 4


def test_es_hogar_de_captures_household_size():
    fact = _fact("Vivo en un hogar de 3 personas en Los Angeles", "household.size")
    assert fact is not None
    assert fact["suggested_value"] == 3


def test_es_ingreso_mensual_captures_income_and_frequency():
    names = _canonical_names("Mi ingreso mensual es 2500 dolares")
    assert "income.frequency" in names
    fact = _fact("Mi ingreso mensual es 2500 dolares", "income.estimate")
    assert fact is not None
    assert fact["suggested_value"] == 2500


def test_es_gano_al_mes_captures_income():
    fact = _fact("Gano 3000 al mes", "income.estimate")
    assert fact is not None
    assert fact["suggested_value"] == 3000


def test_es_trabajo_captures_employer_coverage_offer():
    names = _canonical_names("Mi trabajo me ofrece seguro")
    assert "employer.coverage_offer" in names


def test_es_forbidden_eligibility_language_is_flagged():
    names = _canonical_names("Diga que definitivamente califico para Medi-Cal")
    assert "safety.user_requested_forbidden_eligibility_language" in names


def test_english_patterns_still_work():
    # Regression: adding Spanish must not break the English happy path.
    names = _canonical_names("I am uninsured and I live in 94110")
    assert "insurance.current_status" in names
    assert "insurance.needs_health_coverage" in names
    assert "location.zip" in names


def test_english_household_size_still_works():
    fact = _fact("My household has 5 people", "household.size")
    assert fact is not None
    assert fact["suggested_value"] == 5
