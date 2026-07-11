from pydantic import BaseModel


class SourceHealthData(BaseModel):
    source_id: str
    status: str
    last_success_at: str | None = None
    last_attempt_at: str | None = None
    current_cache_age_hours: float | None = None
    official_url: str
    message: str

