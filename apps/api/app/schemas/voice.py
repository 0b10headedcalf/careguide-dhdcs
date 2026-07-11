from typing import Any

from pydantic import BaseModel, Field


class VapiWebhookRequest(BaseModel):
    case_id: str | None = None
    transcript: str | None = None
    language: str = "en"
    event_type: str = "transcript"
    metadata: dict[str, Any] = Field(default_factory=dict)


class VapiWebhookData(BaseModel):
    configured: bool
    next_question: str
    warnings: list[str] = Field(default_factory=list)

