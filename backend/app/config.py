from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql://postgres:your_password@localhost:5432/societysync"

    # JWT
    JWT_SECRET: str = "CHANGE_ME_USE_A_STRONG_SECRET_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # App
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    MEDIA_ROOT: str = "./media"
    HELPDESK_MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024

    # Resident Helpdesk AI assistant (server-side only)
    AIPIPE_API_KEY: str = ""
    AIPIPE_PROVIDER: str = "auto"
    AIPIPE_BASE_URL: str = "https://aipipe.org"
    AIPIPE_OPENAI_MODEL: str = "gpt-5-nano"
    AIPIPE_OPENROUTER_MODEL: str = "openai/gpt-5-nano"
    AIPIPE_GEMINI_MODEL: str = "gemini-2.5-flash-lite"
    AIPIPE_TIMEOUT_SECONDS: float = Field(default=20.0, ge=1, le=60)

    # Scheduled work (run as a separate process: python scheduler.py)
    SCHEDULER_TIMEZONE: str = "Asia/Kolkata"
    SCHEDULER_RUN_ON_STARTUP: bool = True
    SCHEDULER_MAX_ATTEMPTS: int = Field(default=3, ge=1, le=10)
    SCHEDULER_RETRY_DELAY_SECONDS: float = Field(default=1.0, ge=0, le=60)
    SCHEDULER_MISFIRE_GRACE_SECONDS: int = Field(default=300, ge=1)
    SCHEDULER_FANOUT_INTERVAL_SECONDS: int = Field(default=60, ge=10)
    SCHEDULER_EXPIRY_INTERVAL_SECONDS: int = Field(default=60, ge=10)
    SCHEDULER_BOOKING_INTERVAL_SECONDS: int = Field(default=60, ge=10)
    SCHEDULER_LATE_FEE_PAISE: int = Field(default=50_000, ge=0)

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
