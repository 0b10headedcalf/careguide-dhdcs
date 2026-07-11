from typing import Any

from pydantic import BaseModel, ValidationError

from app.adapters.digitalocean_gradient import DigitalOceanGradientAdapter
from app.adapters.nvidia_nim import NVIDIANIMAdapter
from app.services.intake_normalizer import deterministic_case_delta, next_question


class LLMCaseDelta(BaseModel):
    canonical_name: str
    suggested_value: Any
    confidence: float
    explanation_simple: str


class LLMGateway:
    def __init__(self, provider: str = "digitalocean"):
        self.adapter = NVIDIANIMAdapter() if provider == "nvidia" else DigitalOceanGradientAdapter()

    async def extract_case_delta(self, message: str, message_id: str) -> list[dict]:
        response = await self.adapter.chat_json([{"role": "user", "content": message}])
        if not response:
            return deterministic_case_delta(message, message_id)
        try:
            return [LLMCaseDelta.model_validate(item).model_dump() for item in response.get("case_delta", [])]
        except ValidationError:
            return deterministic_case_delta(message, message_id)

    async def translate(self, text: str, target_language: str) -> str:
        return text

    async def simplify(self, text: str) -> str:
        return text

    async def generate_clarifying_question(self, facts: dict, language: str) -> str:
        return next_question(facts, language)

    async def summarize_handoff(self, confirmed_information: dict) -> str:
        return "Prepared application packet summary is ready for user review."

