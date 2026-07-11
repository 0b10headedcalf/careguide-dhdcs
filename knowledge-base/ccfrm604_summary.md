# CCFRM604 — Application for Health Insurance (Summary)

**Form ID:** `CCFRM604`
**Official (English, ADA):** https://www.coveredca.com/pdfs/paper-application/CASSA-2020-Application-v61bc-WEB_110325%20ENG-ADA.pdf
**Source:** `covered_ca_forms` (official website)
**Languages verified:** English

## What it is

CCFRM604 is the single main paper application for California health coverage. One
application is used to determine the likely pathway to **Medi-Cal** or a **Covered
California** plan — the applicant does not pick the program; the completed
application and the state/county decide.

## What it collects (plain language)

- **Household** — who is applying, who is in the tax household, household size.
- **Location** — home address and ZIP.
- **Income** — amount and how often it is received (frequency).
- **Employer-Sponsored Coverage** — whether an employer offers coverage. CareBridge
  gathers this ahead of time using the
  [employer coverage worksheet](employer_sponsored_coverage_worksheet.md).
- **Identity and immigration** — collected on the form itself. CareBridge does
  **not** interpret immigration law; mixed-status households are routed to human
  review (see [`../rules/eligibility_rules.yaml`](../rules/eligibility_rules.yaml),
  rule `mixed_household_review_001`).

## How CareBridge uses it

1. Confirmed facts (ZIP, household size, income + frequency, employer offer) are
   mapped to reviewable form fields with provenance.
2. Deterministic rules produce a **likely pathway**, not an eligibility decision.
3. A reviewed handoff packet is prepared for a certified counselor.

## Boundaries

- CareBridge never says "you are eligible," "you qualify," or "your application
  was submitted." It says "likely pathway," "you may be a match," and "prepared
  application packet." See [`safety_and_non_eligibility_policy.md`](safety_and_non_eligibility_policy.md).
- CareBridge never creates or applies a signature, never officially submits the
  form, and never appoints itself as an authorized representative.
- Every mapped field keeps its source type, source reference, confidence, review
  status, risk level, and a simple explanation.
