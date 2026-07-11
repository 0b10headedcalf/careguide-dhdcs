# Safety & Non-Eligibility Policy

The non-negotiable rules for CareBridge CA. This is the plain-language companion to
[`../docs/safety.md`](../docs/safety.md) — if the two ever disagree, `docs/safety.md`
wins. Everything the assistant says or shows must obey these rules.

## The core idea

CareBridge CA prepares people for coverage. It **never decides eligibility, never
submits anything, and never invents data.** Its output is a suggestion until a
human confirms it.

## Language rules — never say / always say

**Never say:**

- "You are eligible" / "You qualify" / "You've been approved."
- "Your application was submitted."
- Anything that states a final determination.

**Always say instead:**

- "Likely pathway."
- "You may be a match."
- "Based on the information provided."
- "Ready for review" / "Prepared application packet."

Reason: eligibility is decided by the state, county, or Covered California — not by
CareBridge. See [`medi_cal_vs_coveredca_plain_language.md`](medi_cal_vs_coveredca_plain_language.md).

## No invented data

- No fake external data of any kind.
- No invented clinics, counselors, phone numbers, opening hours, language support,
  forms, or eligibility determinations.
- Empty official-source results must be returned honestly.
- Cached official snapshots must be labeled as cached, with source URL and
  retrieval timestamp.
- Only forms in [`../data/form_catalog.json`](../data/form_catalog.json) and sources
  in [`../data/source_registry.json`](../data/source_registry.json) may be surfaced.

## Hard boundaries — CareBridge never…

- Interprets immigration law. (Mixed-status households → human review.)
- Provides medical diagnosis or treatment advice.
- Creates or applies a signature.
- Appoints CareBridge CA as an authorized representative.
- Officially submits forms or documents.

External actions (sending, submitting) require **explicit user confirmation**.

## Provenance requirements

- Every cached external record includes: source ID, source type, URL, retrieval
  timestamp, content hash, and cache status.
- Every mapped form field includes: source type, source reference, confidence,
  review status, risk level, and a simple explanation.
- LLM output is schema-validated and treated as a **suggestion until confirmed** —
  it cannot overwrite deterministic rules, choose official forms, verify packets,
  or invent resources.

## Privacy

Logs must **not** contain full SSNs, immigration document numbers, API keys, raw
uploads, or unredacted intake messages when raw logging is disabled. Raw intake
messages are off by default; redaction strips SSNs, long numeric identifiers, API
keys, tokens, and authorization values.

## Where these rules are enforced

- Deterministic core + LLM boundaries: [`../docs/backend-architecture.md`](../docs/backend-architecture.md)
- Pathway rules: [`../rules/eligibility_rules.yaml`](../rules/eligibility_rules.yaml)
- Full rule set: [`../docs/safety.md`](../docs/safety.md)
