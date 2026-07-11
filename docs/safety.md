# Safety Rules

- No fake external data.
- No invented clinics, counselors, phone numbers, opening hours, language support, forms, or eligibility determinations.
- Every cached external record includes source ID, source type, URL, retrieval timestamp, content hash, and cache status.
- Every mapped form field includes source type, source reference, confidence, review status, risk level, and simple explanation.
- LLM output is a suggestion until validated and confirmed.
- Never say “You are eligible,” “You qualify,” or “Your application was submitted.”
- Use “likely pathway,” “you may be a match,” “based on the information provided,” “ready for review,” and “prepared application packet.”
- Never interpret immigration law.
- Never provide medical diagnosis or treatment advice.
- Never create or apply signatures.
- Never appoint CareBridge CA as an authorized representative.
- Never officially submit forms.
- External actions require explicit user confirmation.
- Logs must not contain full SSNs, immigration document numbers, API keys, raw uploads, or unredacted intake messages when raw logging is disabled.
- Empty official-source results must be returned honestly.
- Cached official snapshots must be labeled as cached with source URL and timestamp.

