from uuid import uuid4

from sqlmodel import Field

from app.utils.dates import utc_now


def uuid_str() -> str:
    return str(uuid4())


def primary_key() -> str:
    return Field(default_factory=uuid_str, primary_key=True, index=True)


def created_at_field():
    return Field(default_factory=utc_now, nullable=False)


def updated_at_field():
    return Field(default_factory=utc_now, nullable=False)

