# API Examples

All endpoints are mounted under `/api`.

## Create Case

```http
POST /api/cases
Content-Type: application/json

{
  "language": "en",
  "explanation_style": "simple",
  "consent_status": "granted"
}
```

## Submit Intake Message

```http
POST /api/intake/message
Content-Type: application/json

{
  "case_id": "case-id",
  "message": "I lost my insurance last month and live in 95814",
  "language": "en",
  "input_mode": "text"
}
```

## Confirm Fact

```http
POST /api/intake/confirm
Content-Type: application/json

{
  "case_id": "case-id",
  "canonical_name": "location.zip",
  "value": "95814",
  "confirmed": true
}
```

## Evaluate Likely Pathway

```http
POST /api/eligibility/evaluate
Content-Type: application/json

{ "case_id": "case-id" }
```

Response language uses likely-pathway wording only. The backend never states that a user is eligible or qualified.

