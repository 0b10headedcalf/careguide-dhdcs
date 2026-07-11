from fastapi import APIRouter

from app.api.routes import agent, cases, documents, eligibility, forms, handoff, health, intake, resources, source_health, voice

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(cases.router, tags=["cases"])
api_router.include_router(agent.router, tags=["agent"])
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(intake.router, tags=["intake"])
api_router.include_router(eligibility.router, tags=["eligibility"])
api_router.include_router(forms.router, tags=["forms"])
api_router.include_router(resources.router, tags=["resources"])
api_router.include_router(handoff.router, tags=["handoff"])
api_router.include_router(source_health.router, tags=["source-health"])
api_router.include_router(voice.router, tags=["voice"])
