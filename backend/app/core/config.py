"""Central application configuration.

Every runtime value comes from the environment (or a local ``.env`` file) so the
same image can run locally, in CI and on ECS without code changes.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ------------------------------------------------------------------ app
    app_name: str = "CoursePulse API"
    app_version: str = "1.0.0"
    environment: Literal["local", "dev", "test", "production"] = "local"
    debug: bool = False
    log_level: str = "INFO"

    # ------------------------------------------------------------- database
    # psycopg (v3) driver. Example:
    #   postgresql+psycopg://user:password@host:5432/coursepulse
    database_url: str = "postgresql+psycopg://coursepulse:coursepulse@localhost:5432/coursepulse"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800
    db_echo: bool = False

    # ------------------------------------------------------------------ api
    api_prefix: str = "/api"
    # Comma separated list, e.g. "http://localhost:5173,https://dxxxx.cloudfront.net".
    # NoDecode stops pydantic-settings from trying to JSON-parse the raw value,
    # so the validator below can accept a plain comma separated string.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    # --------------------------------------------------------------- security
    # Never commit a real value: supplied through .env locally and through
    # AWS Secrets Manager on ECS.
    jwt_secret: str = "change-me-in-every-real-environment"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    max_request_body_bytes: int = 64 * 1024

    # ------------------------------------------------------- admin bootstrap
    # Only used by scripts/create_admin.py. Left empty by default on purpose.
    admin_email: str = ""
    admin_password: str = ""

    # ------------------------------------------------------- domain settings
    default_page_size: int = 12
    max_page_size: int = 50
    recent_reviews_limit: int = 5
    # A course needs at least this many visible reviews before it can be
    # reported as "top rated" - protects the stat from a single 5-star review.
    min_reviews_for_top_rated: int = 3

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Allow CORS origins to be provided as a comma separated string."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance."""
    return Settings()


settings = get_settings()
