from fastapi import Header

from app.adapters.vapi import verify_vapi_secret


def verify_webhook_secret(x_vapi_secret: str | None = Header(default=None)) -> bool:
    return verify_vapi_secret(x_vapi_secret)

