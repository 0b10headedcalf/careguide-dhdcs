from typing import Any

from pydantic import BaseModel, Field


class CaseOnlyRequest(BaseModel):
    case_id: str


class FormMapRequest(BaseModel):
    case_id: str
    form_id: str


class FormNextQuestionRequest(BaseModel):
    case_id: str
    language: str = "en"
    explanation_level: str = "simple"
    form_id: str = "CCFRM604"


class FormAnswerRequest(FormNextQuestionRequest):
    answer: str = Field(min_length=1, max_length=4000)
    field_name: str | None = None
    input_mode: str = "text"


class FormConfirmFieldRequest(FormNextQuestionRequest):
    field_name: str
    official_label: str | None = None
    value: Any
    source_type: str = "user_text"
    confidence: float = 1.0
    needs_review: bool = False
    explanation: str = ""
    confirmed: bool = True


class TriggeredForm(BaseModel):
    form_id: str
    name: str
    reason: str
    official_url: str
    source_id: str
    retrieved_at: str
    status: str


class FormRouteData(BaseModel):
    triggered_forms: list[TriggeredForm]


class MappedField(BaseModel):
    official_field_label: str
    canonical_field_name: str
    value: Any
    source_type: str
    source_ref: str
    confidence: float
    needs_review: bool
    risk_level: str
    explanation_simple: str


class FormMapData(BaseModel):
    form_id: str
    fields: list[MappedField]


class VerifyData(BaseModel):
    blocking_flags: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    ready_for_handoff: bool
