# Income Attestation Rules

**Form ID:** `INCOME_ATTESTATION`
**Name:** Attestation of Income, No Documentation Available
**Official (English):** https://www.coveredca.com/pdfs/Attestation-Form-Income-No-Documentation-Available-English.pdf
**Source:** `covered_ca_forms` (official website)

## What it is

An official Covered California form for cases where standard income documentation
(pay stubs, tax forms) may not be available, or income is irregular. It lets a
person attest to their income when they cannot produce the usual paperwork.

## When CareBridge routes to it

Routed when either condition holds
(`../rules/form_routes.yaml`, rule `form_route_income_attestation_001`):

- `income.documentation_unavailable` = `true`, **or**
- `income.type` is one of `irregular`, `seasonal`, `gig`, `cash`.

This is why a gig worker with no documents (e.g. persona P17 in
[`../docs/analysis/pathway_distribution.md`](../docs/analysis/pathway_distribution.md))
is guided toward attestation while still landing on a Medi-Cal-likely pathway.

## Language handling — important

- **No public Spanish PDF** is listed on `coveredca.com/espanol/support/forms/`
  as of 2026-07-11. Do **not** invent a Spanish URL.
- For Spanish speakers, the UI must either fall back to the English form or route
  the person to a bilingual certified enrollment counselor. This note is carried
  in [`../data/form_catalog.json`](../data/form_catalog.json) (`INCOME_ATTESTATION.notes`).

## Boundaries

- Attestation supports an application; it does **not** by itself establish
  eligibility. The state or county still makes the final decision.
- Related document requirement: `proof_of_income` in
  [`../rules/document_rules.yaml`](../rules/document_rules.yaml) — income must be
  reviewed before an application packet is prepared. Attestation is the fallback
  when documentation cannot be provided.
- CareBridge never creates or applies a signature on this form.
