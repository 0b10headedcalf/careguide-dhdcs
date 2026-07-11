"""EMPLOYER_COVERAGE_PREVIEW is a CareBridge-generated worksheet, not an official form.

Locks in that the form_router returns it with is_preview=True and a disclaimer,
so the frontend can render a "not an official form" badge and honor safety.md.
"""


def _confirm(client, case_id, canonical_name, value):
    return client.post(
        "/api/intake/confirm",
        json={"case_id": case_id, "canonical_name": canonical_name, "value": value, "confirmed": True},
    )


def test_employer_coverage_preview_is_flagged_as_preview(client, case_id):
    for canonical_name, value in [
        ("location.zip", "94110"),
        ("insurance.needs_health_coverage", True),
        ("household.size", 2),
        ("income.estimate", 2000),
        ("income.frequency", "monthly"),
        ("employer.coverage_offer", "unknown"),
    ]:
        _confirm(client, case_id, canonical_name, value)

    client.post("/api/eligibility/evaluate", json={"case_id": case_id})
    forms = client.post("/api/forms/route", json={"case_id": case_id}).json()["data"]["triggered_forms"]

    preview = next((f for f in forms if f["form_id"] == "EMPLOYER_COVERAGE_PREVIEW"), None)
    assert preview is not None, "EMPLOYER_COVERAGE_PREVIEW must fire when employer.coverage_offer is unknown"
    assert preview["is_preview"] is True
    assert preview["source_type"] == "carebridge_generated"
    assert preview["maps_to_form_id"] == "CCFRM604"
    assert preview["preview_disclaimer"]
    assert "not an official" in preview["preview_disclaimer"].lower()


def test_ccfrm604_is_not_flagged_as_preview(client, case_id):
    for canonical_name, value in [
        ("location.zip", "94110"),
        ("insurance.needs_health_coverage", True),
        ("household.size", 2),
        ("income.estimate", 2000),
        ("income.frequency", "monthly"),
    ]:
        _confirm(client, case_id, canonical_name, value)

    client.post("/api/eligibility/evaluate", json={"case_id": case_id})
    forms = client.post("/api/forms/route", json={"case_id": case_id}).json()["data"]["triggered_forms"]

    ccfrm604 = next((f for f in forms if f["form_id"] == "CCFRM604"), None)
    assert ccfrm604 is not None
    assert ccfrm604["is_preview"] is False
    assert ccfrm604["source_type"] == "official_website"
