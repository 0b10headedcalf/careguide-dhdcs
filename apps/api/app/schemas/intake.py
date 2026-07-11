from typing import Any

from pydantic import BaseModel, Field


class IntakeMessageRequest(BaseModel):
    case_id: str
    message: str = Field(min_length=1)
    language: str = "en"
    input_mode: str = "text"


class CaseDeltaSuggestion(BaseModel):
    canonical_name: str
    suggested_value: Any
    source_type: str = "agent_suggestion"
    source_ref: str
    confidence: float
    needs_review: bool
    explanation_simple: str
    auto_confirmed: bool = False


class IntakeMessageData(BaseModel):
    case_delta: list[CaseDeltaSuggestion]
    next_question: str
    confirmation_needed: bool
    warnings: list[str] = Field(default_factory=list)
    progress: dict[str, Any] = Field(default_factory=dict)
    auto_confirmed_facts: list[str] = Field(default_factory=list)


class IntakeConfirmRequest(BaseModel):
    case_id: str
    canonical_name: str
    value: Any
    confirmed: bool


class IntakeConfirmData(BaseModel):
    case_id: str
    canonical_name: str
    confirmed: bool
    fact_id: str | None = None

