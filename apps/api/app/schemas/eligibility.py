from pydantic import BaseModel, Field


class EvaluateRequest(BaseModel):
    case_id: str


class EvaluateData(BaseModel):
    likely_pathway: str
    supported_by_current_answers: bool
    human_review_required: bool
    explanation_simple: str
    missing_questions: list[str] = Field(default_factory=list)
    conflicting_information: list[str] = Field(default_factory=list)
    triggered_rule_ids: list[str] = Field(default_factory=list)
    next_best_action: str

