from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.utils.dates import utc_now_iso


class Meta(BaseModel):
    request_id: str
    timestamp: str = Field(default_factory=utc_now_iso)


class SuccessEnvelope(BaseModel):
    data: Any
    meta: Meta


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelope(BaseModel):
    error: ErrorBody
    meta: Meta


def success(data: Any, request_id: str) -> dict:
    return {"data": data, "meta": Meta(request_id=request_id).model_dump()}


def error(code: str, message: str, request_id: str, details: dict | None = None) -> dict:
    return {
        "error": {"code": code, "message": message, "details": details or {}},
        "meta": Meta(request_id=request_id).model_dump(),
    }

