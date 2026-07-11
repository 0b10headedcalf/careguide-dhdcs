from pydantic import BaseModel


class HandoffRequest(BaseModel):
    case_id: str
    user_reviewed: bool


class HandoffData(BaseModel):
    packet_id: str
    title: str
    html: str
    user_reviewed: bool

