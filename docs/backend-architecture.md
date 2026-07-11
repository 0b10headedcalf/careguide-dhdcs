# Backend Architecture

CareBridge CA is split into a deterministic core and optional provider adapters.

## Deterministic Core

The core owns case persistence, normalized facts, pathway rules, form routing, field mapping, verification, source metadata, and handoff packets. Eligibility is never final; the API returns a likely pathway based on confirmed facts and YAML rules.

## LLM Boundaries

LLM providers can extract suggested facts, translate, simplify, ask clarifying questions, and summarize confirmed information. LLM output is always schema-validated and treated as a suggestion until confirmed. It cannot overwrite deterministic rules, choose official forms, verify packets, invent resources, interpret immigration law, provide medical advice, sign, submit, or appoint representatives.

## Data Flow

1. A case is created.
2. Intake messages are redacted and stored.
3. Structured fact suggestions are returned.
4. User confirmation writes normalized facts.
5. Deterministic rules produce a likely pathway.
6. Form route rules identify official forms.
7. Field mapping creates reviewable form values with provenance.
8. Verification blocks unsafe handoff.
9. Resource search returns only real public/official source records.
10. A reviewed handoff packet is generated as accessible HTML.

## Source Priority

1. HRSA public source
2. California official/public datasets
3. DataSF
4. Google Maps as supplemental only

Google is not used as authority for enrollment certification, FQHC status, sliding-fee eligibility, or language support.

## Database Model

The database uses SQLModel over SQLAlchemy 2 and supports SQLite locally and PostgreSQL in production. Core tables include cases, case_facts, intake_messages, pathway_results, form_routes, form_field_values, resources, case_resource_recommendations, source_snapshots, audit_events, and handoff_packets.

## Frontend Integration

The frontend calls `/api` endpoints and receives a consistent JSON envelope. OpenAPI is available at `/openapi.json` and Swagger docs at `/docs`.

## Privacy

Raw intake messages are disabled by default. Logs use request metadata and avoid request bodies. Redaction removes SSNs, long numeric identifiers, API keys, tokens, authorization values, and private secrets.

## Deployment

DigitalOcean App Platform can run the Dockerfile in `apps/api`. Production should use managed PostgreSQL via `DATABASE_URL` and encrypted environment variables.

