import json

import httpx

from app.core.config import get_settings


def _extract_json_object(content: str) -> dict | None:
    """Agent replies may wrap JSON in prose or ``` fences. Parse defensively —
    a None return sends the caller to the deterministic fallback."""
    text = content.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


class DigitalOceanGradientAdapter:
    provider_name = "digitalocean"

    async def chat_json(self, messages: list[dict]) -> dict | None:
        """Call the DO Gradient agent (OpenAI-compatible chat completions).
        The agent's own instructions — configured in the DO console — define
        the JSON contract; see LLMGateway for the expected case_delta shape."""
        settings = get_settings()
        endpoint = settings.DIGITALOCEAN_AGENT_ENDPOINT.rstrip("/")
        key = settings.DIGITALOCEAN_AGENT_ENDPOINT_KEY
        if not endpoint or not key:
            return None
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{endpoint}/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={"messages": messages, "stream": False},
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            return None
        if not isinstance(content, str):
            return None
        return _extract_json_object(content)
