"""Handoff Passport rendering + HTML retrieval.

Locks in the contract the frontend depends on: POST returns an envelope with
packet_id + html, GET returns raw HTML with the disclaimer, pathway label,
and source list. Refuses to generate a packet if the user hasn't reviewed.
"""


def _seed_case_and_confirm(client, case_id):
    for canonical_name, value in [
        ("location.zip", "94110"),
        ("insurance.needs_health_coverage", True),
        ("household.size", 2),
        ("income.estimate", 2000),
        ("income.frequency", "monthly"),
    ]:
        client.post(
            "/api/intake/confirm",
            json={"case_id": case_id, "canonical_name": canonical_name, "value": value, "confirmed": True},
        )
    client.post("/api/eligibility/evaluate", json={"case_id": case_id})
    client.post("/api/forms/route", json={"case_id": case_id})


def test_handoff_refuses_when_not_user_reviewed(client, case_id):
    response = client.post("/api/handoff-passport", json={"case_id": case_id, "user_reviewed": False})
    assert response.status_code == 400


def test_handoff_generates_packet_and_returns_html_envelope(client, case_id):
    _seed_case_and_confirm(client, case_id)
    response = client.post("/api/handoff-passport", json={"case_id": case_id, "user_reviewed": True})
    assert response.status_code == 200
    data = response.json()["data"]
    assert "packet_id" in data
    assert "html" in data
    assert data["user_reviewed"] is True
    # Rendered packet must include the disclaimer and the CareBridge title
    assert "Not an official submission" in data["html"]
    assert "Handoff Passport" in data["html"]


def test_handoff_html_endpoint_returns_raw_html(client, case_id):
    _seed_case_and_confirm(client, case_id)
    post_response = client.post(
        "/api/handoff-passport", json={"case_id": case_id, "user_reviewed": True}
    )
    packet_id = post_response.json()["data"]["packet_id"]

    html_response = client.get(f"/api/handoff-passport/{packet_id}/html")
    assert html_response.status_code == 200
    assert html_response.headers["content-type"].startswith("text/html")
    body = html_response.text
    # Structural checks: disclaimer, pathway heading, source list section.
    assert "<!doctype html>" in body
    assert "Not an official submission" in body
    assert "Likely pathway" in body
    assert "Source list" in body
    assert "Print / Save as PDF" in body


def test_handoff_html_endpoint_404s_for_unknown_packet(client):
    response = client.get("/api/handoff-passport/does-not-exist/html")
    assert response.status_code == 404
