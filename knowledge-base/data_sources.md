# Data Sources

The external sources CareBridge CA depends on. This is the plain-language view;
the machine-readable source of truth is
[`../data/source_registry.json`](../data/source_registry.json), and the full URL
list is [`../docs/sources.md`](../docs/sources.md). **Do not add a source that is
not verifiable from a public URL, and do not invent URLs.**

## Official sources

| Source | Type | Used for |
|---|---|---|
| **Covered California Forms** (`covered_ca_forms`) | Official website | Official form names, URLs, and language availability |
| **Covered California Local Help** (`covered_ca_local_help`) | Official website | Certified Enrollment Counselor (CEC) search URL |
| **HRSA Primary Health Care Facilities** (`hrsa_health_centers`) | Public API | Nearby health center name, phone, address, type, status |
| **DataSF Health Care Facilities** (`datasf_health_care_facilities`) | Public API | San Francisco facility name, type, services, location |

All of the above are `official: true` with cache policy
`official_snapshot_allowed` and a default TTL of 24 hours.

## Non-official / supplemental sources

| Source | Type | Used for | Not authoritative for |
|---|---|---|---|
| **CareBridge Preview Worksheet** (`carebridge_preview`) | CareBridge-generated | Employer-coverage questions mirroring CCFRM604 | Anything official; it is not a form |
| **Google Maps Platform** (`google_maps`) | Supplemental API | Geocoding, place name, address, coordinates, directions | Enrollment certification, FQHC status, sliding-fee eligibility, language support |

The CareBridge worksheet is `not_cached` (TTL 0). Google Maps uses
`supplemental_snapshot_allowed` with a 24-hour TTL.

## Key URLs (verified 2026-07-11)

- Covered California forms (EN): https://www.coveredca.com/support/forms/
- Covered California forms (ES): https://www.coveredca.com/espanol/support/forms/
- Find Local Help / CEC search: https://apply.coveredca.com/static/lw-enrollment/anon/locateAssistance/locateAssistanceSearch?helpType=cec
- HRSA — Find a Health Center: https://findahealthcenter.hrsa.gov/
- HHS Poverty Guidelines (FPL, used by the eligibility engine): https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines

(See [`../docs/sources.md`](../docs/sources.md) for the complete list, including
policy/research context and optional AI providers.)

## Caching and provenance

- Cached official snapshots live in
  [`../data/cached_official/`](../data/cached_official/). Each record carries its
  `source_url` and `retrieved_at`.
- The UI must **visibly label cached data as cached**, with its retrieval date.
- Empty official-source results are returned honestly — never backfilled with
  invented data.

See [`resource_ranking_policy.md`](resource_ranking_policy.md) for how these
sources are prioritized, and [`safety_and_non_eligibility_policy.md`](safety_and_non_eligibility_policy.md)
for the non-negotiable rules.
