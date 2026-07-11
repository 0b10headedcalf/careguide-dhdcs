from app.core.config import get_settings
from app.rules.loader import load_json


def load_form_catalog() -> list[dict]:
    settings = get_settings()
    return load_json(settings.resolved_path(settings.FORM_CATALOG_PATH))


def local_help_link() -> str:
    return get_settings().COVERED_CA_LOCAL_HELP_URL

