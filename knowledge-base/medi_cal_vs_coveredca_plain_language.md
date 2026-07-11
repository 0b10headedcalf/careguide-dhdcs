# Medi-Cal vs Covered California — Plain Language

A plain-language explanation of the two coverage pathways CareBridge can point
toward. This is educational context, **not** an eligibility decision. The likely
pathway is produced by the deterministic rules in
[`../rules/eligibility_rules.yaml`](../rules/eligibility_rules.yaml); the state or
county makes the final decision.

## The short version

- **Medi-Cal** — California's free or very low-cost health coverage for people with
  lower incomes.
- **Covered California** — the state's marketplace where people buy a private
  health plan, often with financial help (subsidies) that lowers the monthly cost.

You do not choose the program by preference. A single application (CCFRM604)
covers both programs, and income and household details determine which pathway
fits.

## How the pathway is decided (likely pathway only)

CareBridge compares household income to the **Federal Poverty Level (FPL)** for the
household size, using the rules below. FPL percentages come from the HHS Poverty
Guidelines (see [`data_sources.md`](data_sources.md)).

| Situation | Likely pathway | Rule |
|---|---|---|
| Income below ~138% FPL | **Medi-Cal likely** | `medi_cal_income_gate_001` |
| Income roughly 138%–400% FPL (138% included) | **Covered California likely** (with financial help) | `covered_ca_subsidy_range_001` |
| Income above ~400% FPL | **Covered California likely** (financial help less likely) | `covered_ca_higher_income_001` |
| Mixed immigration status household | **Human review** | `mixed_household_review_001` |
| ZIP or household/income facts missing | **Human review** | `intake_needs_zip_001`, `intake_incomplete_fallback_001` |

Boundary cases (e.g. right at 138% FPL) resolve to Covered California likely — see
persona P19 in [`../docs/analysis/pathway_distribution.md`](../docs/analysis/pathway_distribution.md).

## Plain-language phrasing to use

- ✅ "Based on the information you provided, you may be a match for Medi-Cal."
- ✅ "A Covered California plan with financial help may be a match."
- ✅ "The state, county, or Covered California makes the final decision."
- ❌ Never: "You are eligible," "You qualify," "You've been approved."

## Mixed-status households

If a household includes members with different immigration statuses, different
members may have different pathways. CareBridge **does not interpret immigration
law** — these cases always go to a certified enrollment counselor for human review.

See [`safety_and_non_eligibility_policy.md`](safety_and_non_eligibility_policy.md)
for the full language and boundary rules.
