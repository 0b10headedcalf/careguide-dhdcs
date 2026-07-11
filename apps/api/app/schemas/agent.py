from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentMessageRequest(BaseModel):
    case_id: str
    message: str = Field(min_length=1, max_length=4000)
    language: Literal["en", "es"] = "en"
    explanation_level: Literal["simple", "standard", "detailed"] = "simple"
    form_id: str | None = None
    debug: bool = False


class AgentMessageData(BaseModel):
    assistant_message: str
    next_question: str | None = None
    suggested_case_updates: list[dict[str, Any]] = Field(default_factory=list)
    form_field_candidates: list[dict[str, Any]] = Field(default_factory=list)
    needs_confirmation: bool = False
    safety_flags: list[str] = Field(default_factory=list)
    next_action: str
    agent_available: bool
    metadata: dict[str, Any] | None = None
