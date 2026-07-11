# CareBridge CA — Knowledge Base

Plain-language, human-readable reference notes for the CareBridge CA coverage
assistant. These files explain the domain (Covered California forms, Medi-Cal vs
Covered California, income attestation, document handling, resource ranking, and
safety) in the product's own voice.

## What this is — and is not

- **Is:** grounded reference material for humans (counselors, reviewers, developers)
  and as a retrieval source for the assistant. Every fact here traces back to the
  machine-readable data in [`../data/`](../data/), the rules in [`../rules/`](../rules/),
  or the verified URLs in [`../docs/sources.md`](../docs/sources.md).
- **Is not:** a source of truth for eligibility, and not a place to invent URLs,
  clinics, phone numbers, or forms. If a fact is not verifiable from the repo's
  data or a public official URL, it does not belong here. See
  [`safety_and_non_eligibility_policy.md`](safety_and_non_eligibility_policy.md).

## Contents

| File | Purpose |
|---|---|
| [`coveredca_forms_index.md`](coveredca_forms_index.md) | Index of the official + preview forms CareBridge routes to |
| [`ccfrm604_summary.md`](ccfrm604_summary.md) | Plain summary of the main application (CCFRM604) |
| [`employer_sponsored_coverage_worksheet.md`](employer_sponsored_coverage_worksheet.md) | The CareBridge employer-coverage preview worksheet |
| [`income_attestation_rules.md`](income_attestation_rules.md) | When and how the income attestation form is used |
| [`document_cover_page_rules.md`](document_cover_page_rules.md) | When to attach the Document Cover Page |
| [`medi_cal_vs_coveredca_plain_language.md`](medi_cal_vs_coveredca_plain_language.md) | Plain-language comparison of the two pathways |
| [`resource_ranking_policy.md`](resource_ranking_policy.md) | How nearby resources are ordered and labeled |
| [`data_sources.md`](data_sources.md) | The external sources this product depends on |
| [`safety_and_non_eligibility_policy.md`](safety_and_non_eligibility_policy.md) | Language rules and hard boundaries |

## Ground-truth sources

- Forms: [`../data/form_catalog.json`](../data/form_catalog.json)
- Sources: [`../data/source_registry.json`](../data/source_registry.json) and [`../docs/sources.md`](../docs/sources.md)
- Rules: [`../rules/`](../rules/) (`eligibility_rules.yaml`, `form_routes.yaml`, `document_rules.yaml`)
- Safety: [`../docs/safety.md`](../docs/safety.md)

_Last verified against repo data: 2026-07-11._
