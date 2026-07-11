"""Auto-confirmation integration tests.

Locks in that high-confidence, non-high-risk facts detected by the intake
normalizer are auto-confirmed and become visible to the eligibility engine
without an explicit /api/intake/confirm round-trip. High-risk facts still
require explicit confirmation.
"""


def test_uninsured_message_auto_confirms_coverage_need(client, case_id):
    response = client.post(
        "/api/intake/message",
        json={
            "case_id": case_id,
            "message": "I am uninsured and I live in 94110",
            "language": "en",
        },
    )
    data = response.json()["data"]

    assert "insurance.needs_health_coverage" in data["auto_confirmed_facts"]
    assert "location.zip" in data["auto_confirmed_facts"]

    for suggestion in data["case_delta"]:
        if suggestion["canonical_name"] in {
            "insurance.needs_health_coverage",
            "location.zip",
            "insurance.current_status",
        }:
            assert suggestion["auto_confirmed"] is True


def test_high_risk_facts_are_not_auto_confirmed(client, case_id):
    # income.estimate is in HIGH_RISK_FACTS — must not be auto-confirmed even at high confidence.
    response = client.post(
        "/api/intake/message",
        json={
            "case_id": case_id,
            "message": "my monthly income is around 2000 dollars",
            "language": "en",
        },
    )
    data = response.json()["data"]
    assert "income.estimate" not in data["auto_confirmed_facts"]


def test_auto_confirmed_facts_reach_pathway_engine(client, case_id):
    # ZIP is not high-risk and normalizer gives it 0.98 confidence — should auto-confirm.
    client.post(
        "/api/intake/message",
        json={
            "case_id": case_id,
            "message": "I lost my insurance and I live in 94110",
            "language": "en",
        },
    )
    # Household + income are HIGH_RISK — user must still explicitly confirm.
    for canonical_name, value in [
        ("household.size", 3),
        ("income.estimate", 2100),
        ("income.frequency", "monthly"),
    ]:
        client.post(
            "/api/intake/confirm",
            json={
                "case_id": case_id,
                "canonical_name": canonical_name,
                "value": value,
                "confirmed": True,
            },
        )

    pathway = client.post("/api/eligibility/evaluate", json={"case_id": case_id}).json()["data"]
    # The pathway engine sees location.zip (auto-confirmed) plus household/income (explicitly
    # confirmed), so it should escape the ZIP-missing fallback and produce a real pathway.
    assert pathway["likely_pathway"] in {"medi_cal_likely", "covered_ca_likely", "human_review"}
    assert pathway["likely_pathway"] != "human_review" or "location.zip" not in pathway["missing_questions"]
