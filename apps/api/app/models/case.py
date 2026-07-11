from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key, updated_at_field


class Case(SQLModel, table=True):
    __tablename__ = "cases"

    id: str = primary_key()
    language: str = Field(default="en", index=True)
    explanation_style: str = Field(default="simple")
    status: str = Field(default="created", index=True)
    consent_status: str = Field(default="not_requested")
    user_reviewed: bool = Field(default=False)
    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()


class CaseFact(SQLModel, table=True):
    __tablename__ = "case_facts"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    canonical_name: str = Field(index=True)
    value_json: str
    source_type: str
    source_ref: str
    confidence: float = Field(default=1.0)
    confirmed_by_user: bool = Field(default=False)
    needs_review: bool = Field(default=True)
    risk_level: str = Field(default="low")
    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()


class CaseResourceRecommendation(SQLModel, table=True):
    __tablename__ = "case_resource_recommendations"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    resource_id: str = Field(index=True, foreign_key="resources.id")
    reason_recommended: str
    ranking_score: float = Field(default=0.0)
    distance_miles: Optional[float] = None
    source_priority: int = Field(default=99)
    created_at: datetime = created_at_field()

