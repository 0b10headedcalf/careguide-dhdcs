SUPPORTED_LANGUAGES = {"en", "es"}
# Suggestions at or above this confidence for non-high-risk facts are auto-confirmed
# so the deterministic pathway engine can act on them without an explicit
# /api/intake/confirm round-trip. High-risk facts still require explicit confirmation.
AUTO_CONFIRM_MIN_CONFIDENCE = 0.85
HIGH_RISK_FACTS = {
    "household.size",
    "income.estimate",
    "income.frequency",
    "employer.coverage_offer",
    "location.address",
    "consent.status",
    "identity.document",
    "immigration.document",
}
OFFICIAL_PACKET_TITLE = "CareGuide review packet - not an official submission"
FORBIDDEN_PHRASES = [
    "you are eligible",
    "you qualify",
    "your application was submitted",
]
