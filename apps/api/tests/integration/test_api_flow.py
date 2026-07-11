def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"


def test_case_creation_and_retrieval(client):
    created = client.post("/api/cases", json={"language": "en", "explanation_style": "simple"})
    case_id = created.json()["data"]["case_id"]
    detail = client.get(f"/api/cases/{case_id}")
    assert detail.status_code == 200
    assert detail.json()["data"]["case_id"] == case_id


def test_intake_suggestion_and_confirmation(client, case_id):
    message = client.post(
        "/api/intake/message",
        json={"case_id": case_id, "message": "I lost my insurance and live in 95814", "language": "en"},
    )
    data = message.json()["data"]
    assert data["confirmation_needed"] is False or isinstance(data["case_delta"], list)
    confirm = client.post(
        "/api/intake/confirm",
        json={"case_id": case_id, "canonical_name": "location.zip", "value": "95814", "confirmed": True},
    )
    assert confirm.status_code == 200


def test_deterministic_eligibility_and_form_flow(client, case_id):
    for canonical_name, value in [
        ("location.zip", "95814"),
        ("insurance.needs_health_coverage", True),
        ("household.size", 3),
        ("income.estimate", 2100),
        ("income.frequency", "monthly"),
        ("employer.coverage_offer", "unknown"),
    ]:
        client.post(
            "/api/intake/confirm",
            json={"case_id": case_id, "canonical_name": canonical_name, "value": value, "confirmed": True},
        )
    pathway = client.post("/api/eligibility/evaluate", json={"case_id": case_id}).json()["data"]
    assert pathway["likely_pathway"] in {"medi_cal_likely", "human_review"}
    forms = client.post("/api/forms/route", json={"case_id": case_id}).json()["data"]["triggered_forms"]
    assert any(form["form_id"] == "CCFRM604" for form in forms)
    mapped = client.post("/api/forms/map-fields", json={"case_id": case_id, "form_id": "CCFRM604"}).json()["data"]
    assert all("source_ref" in field for field in mapped["fields"])
    verified = client.post("/api/forms/verify", json={"case_id": case_id, "form_id": "CCFRM604"}).json()["data"]
    assert "blocking_flags" in verified


def test_empty_resources_without_coordinates(client):
    response = client.get("/api/resources/nearby", params={"zip": "95814"})
    assert response.status_code == 200
    assert response.json()["data"]["resources"] == []


def test_handoff_requires_review(client, case_id):
    response = client.post("/api/handoff-passport", json={"case_id": case_id, "user_reviewed": False})
    assert response.status_code == 400

