from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.base import created_at_field, primary_key, updated_at_field


class FormRoute(SQLModel, table=True):
    __tablename__ = "form_routes"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    form_id: str = Field(index=True)
    form_name: str
    official_url: str
    route_reason: str
    rule_id: str
    source_id: str
    retrieved_at: datetime
    status: str = Field(default="suggested")
    created_at: datetime = created_at_field()


class FormFieldValue(SQLModel, table=True):
    __tablename__ = "form_field_values"

    id: str = primary_key()
    case_id: str = Field(index=True, foreign_key="cases.id")
    form_id: str = Field(index=True)
    official_field_label: str
    canonical_field_name: str
    value_json: str
    source_type: str
    source_ref: str
    confidence: float = Field(default=0.0)
    needs_review: bool = Field(default=True)
    risk_level: str = Field(default="low")
    explanation_simple: str
    user_confirmed: bool = Field(default=False)
    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()

