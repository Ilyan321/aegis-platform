import os
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Locate .env in apps/api/.env or current working directory
API_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = API_DIR / ".env"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    PORT: int = 8000
    SECRET_KEY: str = "change-this-to-a-secure-random-32-character-secret"

    # PostgreSQL Database URL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgrespassword@localhost:5432/aegis_db"
    )

    # Redis URL (Upstash or local)
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0"
    )

    # Cryptography
    AEGIS_MASTER_KEY: str = Field(
        default="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    AEGIS_BLIND_PEPPER: str = Field(
        default="default-development-blind-pepper-salt-32chars"
    )

    # Notifications
    SLACK_WEBHOOK_URL: str = ""

    # Email / Resend
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Aegis Security <onboarding@resend.dev>"

    # Webhook defaults
    WEBHOOK_SECRET_DEFAULT: str = "aegis-default-webhook-secret"

    # CORS & Domains
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://aegis-platform-web.vercel.app"
    FRONTEND_URL: str = Field(
        default="https://aegis-platform-web.vercel.app" if os.getenv("RENDER") else "http://localhost:3000"
    )
    BACKEND_URL: str = Field(
        default=os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")
    )

    # OAuth Providers
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH) if ENV_FILE_PATH.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
