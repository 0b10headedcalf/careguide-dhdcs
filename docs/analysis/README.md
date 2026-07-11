# CareBridge CA — Analysis Artifacts

Reproducible reports over the eligibility engine and the real data.

## Files

- [`pathway_distribution.md`](pathway_distribution.md) — human-readable table of how 20 fixed personas route through the deterministic rules.
- `pathway_distribution.json` — same results, machine-readable, with `triggered_rule_ids` per persona.

## Regenerate

Both artifacts come from a single script that uses the real API stack over an
isolated in-memory database, so the run cannot pollute a developer's DB:

```bash
cd apps/api
PYTHONPATH=. python scripts/analyze_personas.py
```

Persona definitions live at [`apps/api/tests/data/personas.json`](../../apps/api/tests/data/personas.json).
Edit that file — do not edit the generated outputs by hand.

## What this artifact proves

- Two intake profiles with different income levels produce different likely pathways
  (Medi-Cal vs. Covered California with subsidies vs. Covered California unsubsidized).
- Mixed-status households route to human review regardless of income
  (CareBridge CA does not interpret immigration law).
- Incomplete intakes fall back to human review without silently guessing.

The CI counterpart lives at
[`apps/api/tests/integration/test_persona_diversity.py`](../../apps/api/tests/integration/test_persona_diversity.py) —
it re-runs a subset of these personas on every backend test invocation so a
future rule change cannot accidentally collapse everyone into a single bucket.
