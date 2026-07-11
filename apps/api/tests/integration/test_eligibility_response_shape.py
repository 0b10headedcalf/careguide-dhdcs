"""Eligibility response shape locks in the contract the frontend depends on.

The Mission Control screen reads verification_flags + missing_questions +
next_best_action from /api/eligibility/evaluate. If any of these keys go
missing, the UI silently loses information — hence this test.
"""


def _confirm(client, case_id, canonical_name, value):
    client.post(
        "/api/intake/confirm",
        json={"case_id": case_id, "canonical_name": canonical_name, "value": value, "confirmed": True},
    )


def test_evaluate_response_contains_frontend_wire_fields(client, case_id):
    for canonical_name, value in [
        ("location.zip", "94110"),
        ("insurance.needs_health_coverage", True),
        ("household.size", 2),
        ("income.estimate", 5000),
        ("income.frequency", "monthly"),
    ]:
        _confirm(client, case_id, canonical_name, value)

    data = client.post("/api/eligibility/evaluate", json={"case_id": case_id}).json()["data"]

    for field in [
        "likely_pathway",
        "explanation_simple",
        "missing_questions",
        "verification_flags",
        "next_best_action",
        "triggered_rule_ids",
        "human_review_required",
    ]:
        assert field in data, f"Frontend depends on `{field}` in the evaluate response"

    # covered_ca_subsidy_range_001 carries a verification flag; make sure it lands.
    assert data["likely_pathway"] == "covered_ca_likely"
    assert data["verification_flags"], "Expected verification_flags to be non-empty for this persona"
