from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


API_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=API_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_ENV: str = "development"
    APP_NAME: str = "CareBridge CA API"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    SECRET_KEY: str = "replace-with-a-long-random-secret"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    FRONTEND_URL: str = "http://localhost:3000"

    DATABASE_URL: str = "sqlite:///./carebridge.db"

    LOG_LEVEL: str = "INFO"
    LOG_REDACTION_ENABLED: bool = True
    STORE_RAW_INTAKE_MESSAGES: bool = False
    STORE_RAW_LLM_RESPONSES: bool = False

    CACHE_ENABLED: bool = True
    CACHE_TTL_HOURS: int = 24
    OFFICIAL_CACHE_DIR: str = "../../data/cached_official"
    SOURCE_REGISTRY_PATH: str = "../../data/source_registry.json"
    FORM_CATALOG_PATH: str = "../../data/form_catalog.json"

    RULES_ELIGIBILITY_PATH: str = "../../rules/eligibility_rules.yaml"
    RULES_FORM_ROUTES_PATH: str = "../../rules/form_routes.yaml"
    RULES_DOCUMENT_PATH: str = "../../rules/document_rules.yaml"

    LLM_PROVIDER: str = "digitalocean"
    DIGITALOCEAN_API_TOKEN: str = ""
    DIGITALOCEAN_MODEL_ACCESS_KEY: str = ""
    DIGITALOCEAN_INFERENCE_BASE_URL: str = "https://inference.do-ai.run/v1"
    DIGITALOCEAN_MODEL_ID: str = ""
    DIGITALOCEAN_AGENT_ID: str = ""
    DIGITALOCEAN_AGENT_ENDPOINT: str = ""
    DIGITALOCEAN_AGENT_ENDPOINT_KEY: str = ""

    NVIDIA_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL_ID: str = ""

    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_STT_MODEL_ID: str = "scribe_v1"
    ELEVENLABS_STT_URL: str = "https://api.elevenlabs.io/v1/speech-to-text"

    VAPI_PUBLIC_KEY: str = ""
    VAPI_PRIVATE_KEY: str = ""
    VAPI_ASSISTANT_ID_EN: str = ""
    VAPI_ASSISTANT_ID_ES: str = ""
    VAPI_SERVER_SECRET: str = ""

    GOOGLE_MAPS_SERVER_API_KEY: str = ""
    GOOGLE_MAPS_RADIUS_METERS: int = 5000

    DATASF_APP_TOKEN: str = ""
    DATASF_HEALTH_FACILITIES_URL: str = "https://data.sfgov.org/resource/jhsu-2pka.json"

    HRSA_ARCGIS_QUERY_URL: str = (
        "https://gisportal.hrsa.gov/server/rest/services/"
        "HealthCareFacilities/PrimaryHealthCareFacilities_FS/MapServer/0/query"
    )

    COVERED_CA_FORMS_URL: str = "https://www.coveredca.com/support/forms/"
    CCFRM604_URL: str = (
        "https://www.coveredca.com/pdfs/paper-application/"
        "CASSA-2020-Application-v61bc-WEB_110325%20ENG-ADA.pdf"
    )
    INCOME_ATTESTATION_URL: str = (
        "https://www.coveredca.com/pdfs/"
        "Attestation-Form-Income-No-Documentation-Available-English.pdf"
    )
    DOCUMENT_COVER_PAGE_URL: str = "https://www.coveredca.com/pdfs/DocumentCoverPage.pdf"
    COVERED_CA_LOCAL_HELP_URL: str = (
        "https://apply.coveredca.com/static/lw-enrollment/anon/"
        "locateAssistance/locateAssistanceSearch?helpType=cec"
    )

    UPLOADS_ENABLED: bool = False
    MAX_UPLOAD_SIZE_MB: int = 10
    LOCAL_UPLOAD_DIR: str = "./private_uploads"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        if isinstance(value, str) and value.lower() in {"release", "production", "prod"}:
            return False
        return value

    def resolved_path(self, path_value: str) -> Path:
        path = Path(path_value)
        if path.is_absolute():
            return path
        return (API_DIR / path).resolve()

    def validate_production(self) -> None:
        if self.APP_ENV == "production" and self.SECRET_KEY == "replace-with-a-long-random-secret":
            raise ValueError("SECRET_KEY must be configured in production")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_production()
    return settings
