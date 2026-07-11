# Resource Ranking Policy

How CareBridge orders and labels the nearby resources (health centers, clinics,
enrollment help) it shows a person. This reflects the source priority in
[`../docs/backend-architecture.md`](../docs/backend-architecture.md) and the
provenance rules in [`../docs/safety.md`](../docs/safety.md).

## Source priority (authority order)

Resources are ranked first by the trustworthiness of their source:

1. **HRSA** — Primary Health Care Facilities (national, official public API).
2. **California official / public datasets** — state-level official sources.
3. **DataSF** — Health Care Facilities dataset (San Francisco only).
4. **Google Maps** — **supplemental only.**

Google Maps is never used as the authority for enrollment certification, FQHC
status, sliding-fee eligibility, or language support. It may supplement geocoding,
place names, addresses, coordinates, and directions links only.

## Ranking within a source

After authority, order by relevance to the person:

1. **Distance** from the person's ZIP / geocoded location (nearest first).
2. **Service match** — facilities offering the services the case needs.
3. **Status** — active / operational facilities (e.g. HRSA `HCC_STATUS_DESC`)
   before inactive ones.

## Hard rules (from safety policy)

- **No invented resources.** Only real records from the public/official sources
  above are shown — never a made-up clinic, counselor, phone number, opening
  hours, or language claim. See [`../docs/safety.md`](../docs/safety.md).
- **Empty results are returned honestly.** If a search finds nothing, say so —
  never fill the gap with a fabricated result.
- **Cached data is labeled as cached.** Every record from
  [`../data/cached_official/`](../data/cached_official/) shows its source URL and
  retrieval date. See [`data_sources.md`](data_sources.md).
- Each shown resource carries its `source_id`, `source_type`, and `official` flag
  from [`../data/source_registry.json`](../data/source_registry.json).

## Official enrollment help

For enrollment help specifically, the authoritative pointer is the Covered
California Certified Enrollment Counselor search — see `covered_ca_local_help` in
the source registry and [`data_sources.md`](data_sources.md).
