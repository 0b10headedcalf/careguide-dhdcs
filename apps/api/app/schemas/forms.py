from typing import Any

from pydantic import BaseModel, Field


class CaseOnlyRequest(BaseModel):
    case_id: str


class FormMapRequest(BaseModel):
    case_id: str
    form_id: str


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

