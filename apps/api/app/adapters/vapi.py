from app.core.config import get_settings


def verify_vapi_secret(provided_secret: str | None) -> bool:
    expected_secret = get_settings().VAPI_SERVER_SECRET
    if not expected_secret:
        return False
    return provided_secret == expected_secret

