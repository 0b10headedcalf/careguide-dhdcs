"""Persona diversity guard.

Runs a small subset of personas through the API and asserts the eligibility
engine still produces distinct pathways. This is CI protection against a
future rule change that accidentally collapses everyone into one bucket.

The full 20-persona sweep lives in scripts/analyze_personas.py and produces
docs/analysis/pathway_distribution.md as an artifact.
"""
import json
from pathlib import Path

import pytest


PERSONAS_PATH = Path(__file__).resolve().parents[1] / "data" / "personas.json"


# Subset that MUST split three ways after the FPL-gated rules land.
DIVERSITY_PERSONA_IDS = ["P01", "P07", "P14", "P16"]


@pytest.fixture(scope="module")
def personas() -> dict[str, dict]:
    return {p["id"]: p for p in json.loads(PERSONAS_PATH.read_text(encoding="utf-8"))}


def _run_persona(client, persona: dict) -> str:
    case_resp = client.post("/api/cases", json={"language": "en", "explanation_style": "simple"})
    case_id = case_resp.json()["data"]["case_id"]
    for canonical_name, value in persona["facts"].items():
        client.post(
            "/api/intake/confirm",
            json={"case_id": case_id, "canonical_name": canonical_name, "value": value, "confirmed": True},
        )
    return client.post("/api/eligibility/evaluate", json={"case_id": case_id}).json()["data"]["likely_pathway"]


def test_personas_produce_at_least_three_distinct_pathways(client, personas):
    outcomes = {pid: _run_persona(client, personas[pid]) for pid in DIVERSITY_PERSONA_IDS}
    distinct = set(outcomes.values())
    assert len(distinct) >= 3, (
        f"Expected at least three distinct pathways across the diversity subset; got {outcomes}"
    )


def test_mixed_status_household_routes_to_human_review(client, personas):
    pathway = _run_persona(client, personas["P14"])
    assert pathway == "mixed_household", (
        f"Mixed-status persona P14 must route to mixed_household regardless of income "
        f"(CareBridge does not interpret immigration law); got {pathway}"
    )


def test_low_income_single_lands_medi_cal(client, personas):
    pathway = _run_persona(client, personas["P01"])
    assert pathway == "medi_cal_likely"


def test_middle_income_couple_lands_covered_ca(client, personas):
    pathway = _run_persona(client, personas["P07"])
    assert pathway == "covered_ca_likely"


def test_missing_zip_falls_back_to_human_review(client, personas):
    pathway = _run_persona(client, personas["P16"])
    assert pathway == "human_review"
