from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    assemblyai_api_key: str = ""
    database_url: str = "sqlite:///./copilot.db"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    resend_api_key: str = ""
    email_from: str = "Warehouse Copilot <onboarding@resend.dev>"
    vendor_email_override: str = ""

    agent_voice: str = "michael"
    # Tablets on a loud dock pick up forklifts and conveyors: isolate the worker's voice.
    voice_focus: str = "far-field"
    token_ttl_seconds: int = 300
    max_session_seconds: int = 1800

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("database_url")
    @classmethod
    def normalize_postgres_scheme(cls, value: str) -> str:
        # Supabase/Render hand out postgres:// URLs; SQLAlchemy needs an explicit driver.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value.removeprefix(prefix)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
