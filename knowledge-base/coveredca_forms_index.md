# Covered California Forms Index

The forms CareBridge CA can route a case to. This mirrors
[`../data/form_catalog.json`](../data/form_catalog.json) — that JSON is the source
of truth; this file is the plain-language index. Routing logic lives in
[`../rules/form_routes.yaml`](../rules/form_routes.yaml).

Official URLs come only from [`../docs/sources.md`](../docs/sources.md). Never
invent or guess a form URL.

## Forms

### CCFRM604 — Application for Health Insurance (official)

- The main application for California health coverage.
- Official (English, ADA): https://www.coveredca.com/pdfs/paper-application/CASSA-2020-Application-v61bc-WEB_110325%20ENG-ADA.pdf
- Languages verified: English.
- Routed when the case indicates health coverage is needed, or the likely
  pathway is `medi_cal_likely`, `covered_ca_likely`, or `human_review`.
- See [`ccfrm604_summary.md`](ccfrm604_summary.md).

### Employer Coverage Preview Worksheet — CareBridge (NOT official)

- A **CareBridge-generated** worksheet that helps a person gather the employer
  coverage details the official CCFRM604 will ask for.
- **Not an official Covered California form.** The answers gathered here feed the
  "Employer-Sponsored Coverage" section of CCFRM604.
- Languages: English, Spanish.
- Routed when `employer.coverage_offer` is `yes`, `unknown`, or missing.
- See [`employer_sponsored_coverage_worksheet.md`](employer_sponsored_coverage_worksheet.md).

### Attestation of Income, No Documentation Available (official)

- Official income attestation form for cases where income documents may not be
  available or income is irregular.
- Official (English): https://www.coveredca.com/pdfs/Attestation-Form-Income-No-Documentation-Available-English.pdf
- **No public Spanish PDF** is listed on `coveredca.com/espanol/support/forms/`
  as of 2026-07-11 — do not invent one. Fall back to English or route Spanish
  speakers to a bilingual counselor.
- Routed when `income.documentation_unavailable` is true, or income type is
  `irregular`, `seasonal`, `gig`, or `cash`.
- See [`income_attestation_rules.md`](income_attestation_rules.md).

### Document Cover Page (official)

- Official cover page for mailing, faxing, or separately sending documents.
- Official (English): https://www.coveredca.com/pdfs/DocumentCoverPage.pdf
- Official (Spanish): https://www.coveredca.com/pdfs/DocumentCoverPageSpanish.pdf
- Routed when `document.delivery_method` is `mail`, `fax`, or `separate_upload`.
- See [`document_cover_page_rules.md`](document_cover_page_rules.md).

## Provenance rules

Every form the product surfaces carries its `source_id`, `source_type`, and the
per-language official URL from the catalog. A form marked `is_preview: true`
(the employer worksheet) must always be labeled as a CareBridge worksheet, never
as an official form.
