# Employer Coverage Preview Worksheet (CareBridge)

**Form ID:** `EMPLOYER_COVERAGE_PREVIEW`
**Source:** `carebridge_preview` (CareBridge-generated, **not official**)
**Maps to:** `CCFRM604` → "Employer-Sponsored Coverage" section
**Languages:** English, Spanish

> **This is not an official Covered California form.** It is a CareBridge-generated
> worksheet. The answers gathered here feed into the employer coverage section of
> the official CCFRM604 application. Every surface that shows this worksheet must
> label it as a CareBridge worksheet, never as an official form.

## Why it exists

The official CCFRM604 application asks about employer-sponsored coverage, and
those questions are easy to get wrong or leave blank. This worksheet lets a person
gather the same information ahead of time, in plain language, so the official
application section can be filled in accurately later.

## When it is offered

Routed when the employer-coverage answer is not a clear "no" —
(`../rules/form_routes.yaml`, rule `form_route_employer_coverage_001`):

- `employer.coverage_offer` = `yes`, **or**
- `employer.coverage_offer` = `unknown`, **or**
- `employer.coverage_offer` is missing.

## What it gathers (plain language)

- Does an employer offer health coverage to the applicant or a household member?
- Who is the employer, and who in the household the offer covers.
- Rough cost of the lowest-cost plan the employer offers for the employee.
- Whether the offer meets the minimum-value / affordability questions the official
  application asks (gathered as plain answers, not interpreted as a determination).

## Boundaries

- The worksheet **does not** decide whether employer coverage makes someone
  ineligible for financial help. That is determined later, downstream, by Covered
  California — not by CareBridge.
- Its output is a suggestion until confirmed, and it carries the
  `preview_disclaimer` from [`../data/form_catalog.json`](../data/form_catalog.json)
  wherever it is shown.
- Related document: employer coverage information is also listed in
  [`../rules/document_rules.yaml`](../rules/document_rules.yaml) (`employer_coverage`).
