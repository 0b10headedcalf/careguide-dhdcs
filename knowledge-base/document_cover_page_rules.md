# Document Cover Page Rules

**Form ID:** `DOCUMENT_COVER_PAGE`
**Name:** Covered California Document Cover Page
**Official (English):** https://www.coveredca.com/pdfs/DocumentCoverPage.pdf
**Official (Spanish):** https://www.coveredca.com/pdfs/DocumentCoverPageSpanish.pdf
**Source:** `covered_ca_forms` (official website)

## What it is

The official cover page Covered California asks people to attach when they send
supporting documents separately — for example by mail or fax, apart from the main
application. It helps Covered California match the documents to the right case.

## When CareBridge routes to it

Routed when documents are delivered separately
(`../rules/form_routes.yaml`, rule `form_route_document_cover_page_001`):

- `document.delivery_method` is `mail`, `fax`, or `separate_upload`.

If documents are provided together with the application in a single reviewed
packet, the separate cover page is not needed.

## Language handling

Both English and Spanish cover pages are official and verified — use the
per-language URL from [`../data/form_catalog.json`](../data/form_catalog.json)
(`official_urls_by_language`). Unlike the income attestation form, a real Spanish
PDF exists here, so Spanish speakers get the Spanish cover page.

## What documents typically accompany it

From [`../rules/document_rules.yaml`](../rules/document_rules.yaml), depending on
the case:

- `proof_of_income` — proof of income
- `employer_coverage` — employer coverage information
- `identity` — identification
- `tax_household` — tax household information

## Boundaries

- The cover page is a mailing/faxing aid only. It does not submit anything and
  does not change eligibility.
- CareBridge never officially submits documents; sending is an external action
  that requires explicit user confirmation.
