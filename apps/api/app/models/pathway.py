from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key


class PathwayResult(SQLModel, table=True):
    __tablename__ = "pathway_results"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    pathway: str = Field(index=True)
    rule_ids_json: str
    explanation_simple: str
    missing_questions_json: str
    verification_flags_json: str
    human_review_required: bool = Field(default=True)
    created_at: datetime = created_at_field()

