# Persona Pathway Distribution

Runs the deterministic eligibility engine over a fixed set of 20 California intake personas and reports which likely-pathway each one lands on. Regenerate with:

```bash
cd apps/api && PYTHONPATH=. python scripts/analyze_personas.py
```

- Generated at: `2026-07-11T18:57:54.840447+00:00`
- Persona count: **20**
- Match rate (actual == expected): **100%**

## Pathway distribution

| Pathway | Count |
|---|---:|
| `covered_ca_likely` | 9 |
| `medi_cal_likely` | 8 |
| `human_review` | 2 |
| `mixed_household` | 1 |

## Per-persona results

| ID | Label | Expected | Actual | Match | Rule |
|---|---|---|---|:---:|---|
| P01 | Single adult, deep poverty, SF | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P02 | Family of 3 on ~$26k/yr, LA | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P03 | Single parent, household 2, Fresno | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P04 | Family of 4 at 112% FPL, San Diego | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P05 | Family of 5 on $42k/yr, Oakland | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P06 | Freelancer single, ~230% FPL, SF | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P07 | Couple at ~$60k/yr, LA | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P08 | Family of 3 at ~$78k/yr, San Diego | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P09 | Single adult at ~$54k/yr, San Jose | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P10 | Family of 4 at ~$120k/yr, Sacramento | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P11 | Recently unemployed, family of 3, SF | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P12 | Single tech worker, ~$144k/yr, SF | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_higher_income_001` |
| P13 | High-income family of 4, San Jose | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_higher_income_001` |
| P14 | Mixed-status household, family of 4, LA | `mixed_household` | `mixed_household` | ✅ | `mixed_household_review_001` |
| P15 | Intake: ZIP-only, no household | `human_review` | `human_review` | ✅ | `intake_incomplete_fallback_001` |
| P16 | Intake: no ZIP | `human_review` | `human_review` | ✅ | `intake_needs_zip_001` |
| P17 | Gig worker, no docs, family of 2, SF | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |
| P18 | Family of 3 with employer offer, mid-income, Oakland | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P19 | Single adult, right at 138% FPL boundary | `covered_ca_likely` | `covered_ca_likely` | ✅ | `covered_ca_subsidy_range_001` |
| P20 | Family of 8 at low income, Central Valley | `medi_cal_likely` | `medi_cal_likely` | ✅ | `medi_cal_income_gate_001` |

## Interpretation

This artifact is evidence the FPL-gated rules in `rules/eligibility_rules.yaml` actually differentiate outcomes across realistic intakes — Medi-Cal for the lowest incomes, Covered California with subsidies in the 138–400% FPL band, unsubsidized Covered California above that, and human review for mixed-status households or incomplete intakes. Each outcome remains a *likely pathway* only; the state or county makes the final decision.
