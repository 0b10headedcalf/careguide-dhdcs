from pathlib import Path
from typing import Any

import yaml

from app.core.exceptions import InvalidRuleConfigurationError


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise InvalidRuleConfigurationError(f"Rule file not found: {path}")
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}
    if not isinstance(data, dict):
        raise InvalidRuleConfigurationError(f"Rule file must contain a mapping: {path}")
    return data


def load_json(path: Path) -> Any:
    import json

    if not path.exists():
        raise InvalidRuleConfigurationError(f"Data file not found: {path}")
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)

