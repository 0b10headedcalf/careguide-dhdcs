"""FPL-gated eligibility rule tests.

These lock in the demo-critical behavior: two different intake profiles
must produce two different pathways.
"""
from app.services.eligibility_engine import _evaluate_clause
from app.services.fpl import annual_fpl, monthly_income, pct_of_fpl


def test_annual_fpl_matches_2025_table_household_of_two():
    assert annual_fpl(2) == 21_150


def test_annual_fpl_extends_beyond_eight_people():
    assert annual_fpl(10) == 54_150 + 2 * 5_500


def test_monthly_income_from_annual():
    assert round(monthly_income(60_000, "annual")) == 5_000


def test_pct_of_fpl_at_138_for_medi_cal_boundary_household_of_one():
    # 138% FPL for household of 1 = 21,597 annual = ~1,800/mo
    pct = pct_of_fpl(estimate=1_800, frequency="monthly", household_size=1)
    assert pct is not None
    assert 137 < pct < 139


def test_medi_cal_rule_fires_at_low_income():
    facts = {
        "location.zip": "94110",
        "household.size": 3,
        "income.estimate": 2_000,  # $24K/yr, well below 138% FPL for 3
        "income.frequency": "monthly",
    }
    clause = {
        "all": [
            {"field": "location.zip", "operator": "exists"},
            {"field": "household.size", "operator": "exists"},
            {"field": "income.estimate", "operator": "exists"},
            {"field": "income.frequency", "operator": "exists"},
            {"field": "income.estimate", "operator": "less_than_pct_fpl", "value": 138},
        ]
    }
    assert _evaluate_clause(clause, facts) is True


def test_covered_ca_rule_fires_in_subsidy_range():
    facts = {
        "location.zip": "94110",
        "household.size": 2,
        "income.estimate": 5_000,  # $60K/yr for 2 => ~284% FPL
        "income.frequency": "monthly",
    }
    clause = {
        "all": [
            {"field": "income.estimate", "operator": "between_pct_fpl", "value": [138, 400]},
        ]
    }
    assert _evaluate_clause(clause, facts) is True


def test_high_income_does_not_fire_medi_cal():
    facts = {
        "location.zip": "94110",
        "household.size": 1,
        "income.estimate": 10_000,  # $120K/yr => ~767% FPL
        "income.frequency": "monthly",
    }
    clause = {
        "all": [
            {"field": "income.estimate", "operator": "less_than_pct_fpl", "value": 138},
        ]
    }
    assert _evaluate_clause(clause, facts) is False


def test_missing_household_size_yields_no_pct():
    assert pct_of_fpl(estimate=2_000, frequency="monthly", household_size=None) is None
