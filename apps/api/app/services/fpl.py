"""Federal Poverty Level helpers for likely-pathway gating.

Source: HHS Poverty Guidelines, 48 contiguous states + DC, published Jan 2025.
https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines

These figures drive a *likely pathway* label only. They are not an official
eligibility determination — the state or county makes the final call.
"""
from typing import Optional

FPL_YEAR = 2025
FPL_2025_ANNUAL_48 = {
    1: 15_650,
    2: 21_150,
    3: 26_650,
    4: 32_150,
    5: 37_650,
    6: 43_150,
    7: 48_650,
    8: 54_150,
}
FPL_2025_INCREMENT_PER_ADDITIONAL_PERSON = 5_500


def annual_fpl(household_size: int) -> Optional[int]:
    if household_size is None or household_size < 1:
        return None
    if household_size <= 8:
        return FPL_2025_ANNUAL_48[household_size]
    return FPL_2025_ANNUAL_48[8] + (household_size - 8) * FPL_2025_INCREMENT_PER_ADDITIONAL_PERSON


_FREQUENCY_TO_MONTHLY_MULTIPLIER = {
    "monthly": 1.0,
    "biweekly": 26 / 12,
    "weekly": 52 / 12,
    "annual": 1 / 12,
    "annually": 1 / 12,
    "yearly": 1 / 12,
}


def monthly_income(estimate: Optional[float], frequency: Optional[str]) -> Optional[float]:
    if estimate is None:
        return None
    if frequency is None:
        return None
    multiplier = _FREQUENCY_TO_MONTHLY_MULTIPLIER.get(str(frequency).lower())
    if multiplier is None:
        return None
    return float(estimate) * multiplier


def pct_of_fpl(estimate: Optional[float], frequency: Optional[str], household_size: Optional[int]) -> Optional[float]:
    monthly = monthly_income(estimate, frequency)
    if monthly is None:
        return None
    annual = monthly * 12
    fpl = annual_fpl(household_size) if household_size else None
    if not fpl:
        return None
    return (annual / fpl) * 100
