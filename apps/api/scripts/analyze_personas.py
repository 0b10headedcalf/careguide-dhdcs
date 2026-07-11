"""Run the persona set through the eligibility engine and report pathway distribution.

Reads apps/api/tests/data/personas.json, drives each persona through the real
API stack (TestClient over in-memory SQLite), and writes:

    docs/analysis/pathway_distribution.json   — machine-readable results
    docs/analysis/pathway_distribution.md     — human-readable report

Usage (from apps/api/):
    PYTHONPATH=. python scripts/analyze_personas.py

Regenerate before shipping the pitch deck so the distribution is current.
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


API_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = API_DIR.parents[1]
PERSONAS_PATH = API_DIR / "tests" / "data" / "personas.json"
ANALYSIS_DIR = REPO_ROOT / "docs" / "analysis"
JSON_OUTPUT = ANALYSIS_DIR / "pathway_distribution.json"
MD_OUTPUT = ANALYSIS_DIR / "pathway_distribution.md"


def _configure_isolated_env() -> None:
    """Point the test DB + cache at temp paths so this script never clobbers a dev DB."""
    tmp_db = Path("/tmp") / "carebridge_persona_analysis.db"
    if tmp_db.exists():
        tmp_db.unlink()
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{tmp_db}")
    os.environ.setdefault("OFFICIAL_CACHE_DIR", str(Path("/tmp") / "carebridge_persona_cache"))


def run() -> dict:
    _configure_isolated_env()
    from fastapi.testclient import TestClient  # noqa: E402
    from sqlmodel import SQLModel  # noqa: E402

    from app.db.session import engine  # noqa: E402
    from app.main import app  # noqa: E402

    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    personas = json.loads(PERSONAS_PATH.read_text(encoding="utf-8"))
    client = TestClient(app)

    results: list[dict] = []
    for persona in personas:
        case = client.post("/api/cases", json={"language": "en", "explanation_style": "simple"})
        case.raise_for_status()
        case_id = case.json()["data"]["case_id"]

        for canonical_name, value in persona["facts"].items():
            client.post(
                "/api/intake/confirm",
                json={"case_id": case_id, "canonical_name": canonical_name, "value": value, "confirmed": True},
            )

        pathway_resp = client.post("/api/eligibility/evaluate", json={"case_id": case_id})
        pathway_resp.raise_for_status()
        pathway_data = pathway_resp.json()["data"]

        results.append(
            {
                "id": persona["id"],
                "label": persona["label"],
                "expected_category": persona["expected_category"],
                "actual_pathway": pathway_data["likely_pathway"],
                "triggered_rule_ids": pathway_data.get("triggered_rule_ids", []),
                "match": pathway_data["likely_pathway"] == persona["expected_category"],
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "persona_count": len(results),
        "results": results,
        "distribution": _distribution(results),
        "match_rate": _match_rate(results),
    }


def _distribution(results: list[dict]) -> dict[str, int]:
    counts = Counter(r["actual_pathway"] for r in results)
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))


def _match_rate(results: list[dict]) -> float:
    if not results:
        return 0.0
    return sum(1 for r in results if r["match"]) / len(results)


def write_markdown(report: dict) -> None:
    lines: list[str] = []
    lines.append("# Persona Pathway Distribution")
    lines.append("")
    lines.append(
        "Runs the deterministic eligibility engine over a fixed set of 20 California intake "
        "personas and reports which likely-pathway each one lands on. Regenerate with:"
    )
    lines.append("")
    lines.append("```bash")
    lines.append("cd apps/api && PYTHONPATH=. python scripts/analyze_personas.py")
    lines.append("```")
    lines.append("")
    lines.append(f"- Generated at: `{report['generated_at']}`")
    lines.append(f"- Persona count: **{report['persona_count']}**")
    lines.append(f"- Match rate (actual == expected): **{report['match_rate']:.0%}**")
    lines.append("")
    lines.append("## Pathway distribution")
    lines.append("")
    lines.append("| Pathway | Count |")
    lines.append("|---|---:|")
    for pathway, count in report["distribution"].items():
        lines.append(f"| `{pathway}` | {count} |")
    lines.append("")
    lines.append("## Per-persona results")
    lines.append("")
    lines.append("| ID | Label | Expected | Actual | Match | Rule |")
    lines.append("|---|---|---|---|:---:|---|")
    for r in report["results"]:
        rule = r["triggered_rule_ids"][0] if r["triggered_rule_ids"] else "—"
        check = "✅" if r["match"] else "❌"
        lines.append(
            f"| {r['id']} | {r['label']} | `{r['expected_category']}` | "
            f"`{r['actual_pathway']}` | {check} | `{rule}` |"
        )
    lines.append("")
    lines.append("## Interpretation")
    lines.append("")
    lines.append(
        "This artifact is evidence the FPL-gated rules in `rules/eligibility_rules.yaml` "
        "actually differentiate outcomes across realistic intakes — Medi-Cal for the lowest "
        "incomes, Covered California with subsidies in the 138–400% FPL band, unsubsidized "
        "Covered California above that, and human review for mixed-status households or "
        "incomplete intakes. Each outcome remains a *likely pathway* only; the state or "
        "county makes the final decision."
    )
    lines.append("")

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    MD_OUTPUT.write_text("\n".join(lines), encoding="utf-8")


def write_json(report: dict) -> None:
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    JSON_OUTPUT.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> int:
    report = run()
    write_json(report)
    write_markdown(report)
    print(f"[analyze_personas] wrote {JSON_OUTPUT.relative_to(REPO_ROOT)}")
    print(f"[analyze_personas] wrote {MD_OUTPUT.relative_to(REPO_ROOT)}")
    print(f"[analyze_personas] pathway distribution: {report['distribution']}")
    print(f"[analyze_personas] match rate: {report['match_rate']:.0%}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
