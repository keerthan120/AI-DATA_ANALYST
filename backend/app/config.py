import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    APP_NAME: str = "AI Data Analyst Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # OpenRouter LLM Configuration
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    # Primary free model with fallback
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")
    OPENROUTER_FALLBACK_MODEL: str = os.getenv("OPENROUTER_FALLBACK_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
    
    # File Storage
    UPLOAD_DIR: Path = Path(__file__).resolve().parent.parent / "uploads"
    
    # Guardrails and Limits
    MAX_UPLOAD_SIZE_MB: int = 50
    SANDBOX_TIMEOUT_SECONDS: int = 15
    MAX_RESULT_ROWS: int = 1000
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
