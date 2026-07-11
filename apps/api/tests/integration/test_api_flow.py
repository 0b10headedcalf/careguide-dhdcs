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


def test_case_language_and_action_plan_persist(client, case_id):
    updated = client.patch(f"/api/cases/{case_id}", json={"language": "es"})
    assert updated.status_code == 200
    assert updated.json()["data"]["language"] == "es"

    detail = client.get(f"/api/cases/{case_id}").json()["data"]
    assert detail["language"] == "es"

    plan = client.get(f"/api/cases/{case_id}/action-plan")
    assert plan.status_code == 200
    assert plan.json()["data"] == {
        "case_id": case_id,
        "status": "created",
        "next_action": "Continue intake",
        "needs_human_review": False,
        "missing_information": [],
    }


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
    assert client.get(f"/api/cases/{case_id}").json()["data"]["status"] == "intake_in_progress"

    pathway = client.post("/api/eligibility/evaluate", json={"case_id": case_id}).json()["data"]
    assert pathway["likely_pathway"] in {"medi_cal_likely", "human_review"}
    assert client.get(f"/api/cases/{case_id}").json()["data"]["status"] == "pathway_ready"

    forms = client.post("/api/forms/route", json={"case_id": case_id}).json()["data"]["triggered_forms"]
    assert any(form["form_id"] == "CCFRM604" for form in forms)
    assert client.get(f"/api/cases/{case_id}").json()["data"]["status"] == "documents_pending"

    mapped = client.post("/api/forms/map-fields", json={"case_id": case_id, "form_id": "CCFRM604"}).json()["data"]
    assert all("source_ref" in field for field in mapped["fields"])
    assert client.get(f"/api/cases/{case_id}").json()["data"]["status"] == "form_drafted"

    verified = client.post("/api/forms/verify", json={"case_id": case_id, "form_id": "CCFRM604"}).json()["data"]
    assert "blocking_flags" in verified
    expected_status = "verification_needed" if verified["blocking_flags"] else "ready_for_human_review"
    assert client.get(f"/api/cases/{case_id}").json()["data"]["status"] == expected_status


def test_empty_resources_without_coordinates(client):
    response = client.get("/api/resources/nearby", params={"zip": "95814"})
    assert response.status_code == 200
    assert response.json()["data"]["resources"] == []


def test_resource_recommendation_is_case_linked_and_idempotent(client, case_id, monkeypatch):
    async def hrsa_nearby(self, *, lat, lng, radius_miles):
        return [
            {
                "external_resource_id": "official-1",
                "name": "Official Test Health Center",
                "resource_type": "hrsa_health_center",
                "address": "100 Test Street",
                "phone": "555-0100",
                "url": "https://example.gov/health-center",
                "lat": lat,
                "lng": lng,
                "verified_language_support": ["es"],
                "services": [],
                "source_id": "hrsa_health_centers",
                "source_type": "public_api",
                "source_url": "https://example.gov/hrsa",
                "retrieved_at": "2026-07-11T00:00:00Z",
                "raw_normalized": {},
            }
        ]

    async def no_results(self, *, lat, lng, radius_miles):
        return []

    monkeypatch.setattr(HRSAAdapter, "nearby", hrsa_nearby)
    monkeypatch.setattr(DataSFAdapter, "nearby", no_results)
    monkeypatch.setattr(GoogleMapsAdapter, "nearby", no_results)

    params = {
        "case_id": case_id,
        "zip": "95814",
        "lat": 38.5816,
        "lng": -121.4944,
        "language": "es",
    }
    first = client.get("/api/resources/nearby", params=params)
    second = client.get("/api/resources/nearby", params=params)
    assert first.status_code == 200
    assert first.json()["data"]["resources"][0]["verified_language_support"] == ["es"]
    assert second.status_code == 200

    detail = client.get(f"/api/cases/{case_id}").json()["data"]
    assert detail["progress_summary"]["resources_selected"] == 1
    assert len(detail["recommended_resources"]) == 1


def test_handoff_requires_review(client, case_id):
    response = client.post("/api/handoff-passport", json={"case_id": case_id, "user_reviewed": False})
    assert response.status_code == 400
from app.adapters.datasf import DataSFAdapter
from app.adapters.google_maps import GoogleMapsAdapter
from app.adapters.hrsa import HRSAAdapter

