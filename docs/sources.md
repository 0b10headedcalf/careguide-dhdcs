# CareBridge CA — Official and Public Sources

This file is the single source of truth for external URLs the product depends on.
Do not paste tool citation tokens into product copy. Do not add a source here
that is not verifiable from a public URL.

Machine-readable equivalent: [`data/source_registry.json`](../data/source_registry.json).
Form catalog with per-language URLs: [`data/form_catalog.json`](../data/form_catalog.json).

## Hackathon

- Devpost — AI for Social Good, MLH & DigitalOcean: https://ai-for-social-good-mlh.devpost.com/

## Covered California — official forms and enrollment help

- Forms and documents (English): https://www.coveredca.com/support/forms/
- Forms and documents (Spanish): https://www.coveredca.com/espanol/support/forms/
- CCFRM604 Application for Health Insurance (EN, ADA): https://www.coveredca.com/pdfs/paper-application/CASSA-2020-Application-v61bc-WEB_110325%20ENG-ADA.pdf
- Attestation of Income, No Documentation Available (EN): https://www.coveredca.com/pdfs/Attestation-Form-Income-No-Documentation-Available-English.pdf
  - No public Spanish PDF listed on `coveredca.com/espanol/support/forms/` as of 2026-07-11 — do not invent a URL.
- Document Cover Page (EN): https://www.coveredca.com/pdfs/DocumentCoverPage.pdf
- Document Cover Page (ES): https://www.coveredca.com/pdfs/DocumentCoverPageSpanish.pdf
- Find Local Help / Certified Enrollment Counselor search: https://apply.coveredca.com/static/lw-enrollment/anon/locateAssistance/locateAssistanceSearch?helpType=cec

## Community health centers and public facilities

- HRSA — Find a Health Center (public search UI): https://findahealthcenter.hrsa.gov/
- HRSA — Primary Health Care Facilities ArcGIS REST service (used by `apps/api/app/adapters/hrsa.py`):
  https://gisportal.hrsa.gov/server/rest/services/HealthCareFacilities/PrimaryHealthCareFacilities_FS/MapServer
- DataSF — Health Care Facilities dataset (used by `apps/api/app/adapters/datasf.py`, San Francisco only):
  https://data.sfgov.org/Health-and-Social-Services/Health-Care-Facilities/jhsu-2pka
- DataSF SODA API docs: https://data.sfgov.org/developers

## Google Maps Platform

Supplemental only. Not authoritative for enrollment certification, FQHC status,
sliding-fee eligibility, or language support.

- Places Nearby Search: https://developers.google.com/maps/documentation/places/web-service/nearby-search

## Policy and research context (not called at runtime)

- CHCF — 2026 California Health Policy Survey: https://www.chcf.org/resource/2026-california-health-policy-survey/
- CMS — June 2025 Medicaid/CHIP Eligibility Operations & Enrollment Snapshot: https://www.medicaid.gov/resources-for-states/downloads/eligib-oper-and-enrol-snap-june2025.pdf
- HHS Poverty Guidelines (used by `apps/api/app/services/fpl.py`):
  https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines

## AI providers (optional)

- NVIDIA NIM — Function/tool calling: https://docs.nvidia.com/nim/large-language-models/1.11.0/function-calling.html
- NVIDIA NIM — API reference: https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html
- DigitalOcean Gradient Starter Kit: https://github.com/digitalocean-labs/gradient-starter-kit
- DigitalOcean GradientAI Platform API: https://docs.digitalocean.com/reference/api/reference/gradientai-platform/

## Provenance rules

Every cached record in `data/cached_official/` carries `source_url` and `retrieved_at`.
The UI must visibly label cached data as cached, with its retrieval date.
See [`docs/safety.md`](safety.md) for the full rule set.
