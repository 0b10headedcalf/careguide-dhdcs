from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    language: str = "en"
    explanation_style: str = "simple"
    consent_status: str = "not_requested"


class CaseUpdate(BaseModel):
    language: str


class CaseCreateData(BaseModel):
    case_id: str
    language: str
    explanation_style: str
    status: str
    created_at: datetime


class CaseFactData(BaseModel):
    canonical_name: str
    value: Any
    source_type: str
    source_ref: str
    confidence: float
    confirmed_by_user: bool
    needs_review: bool
    risk_level: str


class CaseDetailData(BaseModel):
    case_id: str
    language: str
    explanation_style: str
    status: str
    consent_status: str
    user_reviewed: bool
    facts: list[CaseFactData] = Field(default_factory=list)
    latest_pathway_result: dict | None = None
    triggered_forms: list[dict] = Field(default_factory=list)
    verification_flags: list[str] = Field(default_factory=list)
    recommended_resources: list[dict] = Field(default_factory=list)
    uploaded_documents: list[dict] = Field(default_factory=list)
    progress_summary: dict[str, Any] = Field(default_factory=dict)


class ActionPlanData(BaseModel):
    case_id: str
    status: str
    next_action: str
    needs_human_review: bool
    missing_information: list[str] = Field(default_factory=list)
