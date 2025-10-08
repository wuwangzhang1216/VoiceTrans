"""
Configuration management using Pydantic Settings
"""
import os
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # API Keys
    fireworks_api_key: Optional[str] = Field(None, env='FIREWORKS_API_KEY')
    gemini_api_key: Optional[str] = Field(None, env='GEMINI_API_KEY')

    # Application settings
    app_name: str = "VoiceTrans API"
    app_version: str = "2.0.0"
    environment: str = Field("production", env='ENVIRONMENT')
    debug: bool = Field(False, env='DEBUG')

    # Server settings
    host: str = Field("0.0.0.0", env='HOST')
    port: int = Field(8000, env='PORT')

    # CORS settings
    cors_origins: List[str] = Field(
        default=[
            "https://voicetrans.app",
            "https://www.voicetrans.app",
            "https://voicetrans-frontend-c3ee1cda8c9d.herokuapp.com",
            "http://localhost:5173",
            "http://localhost:3000"
        ],
        env='CORS_ORIGINS'
    )

    # API URLs
    fireworks_base_url: str = "https://audio-prod.us-virginia-1.direct.fireworks.ai/v1"

    # Audio processing settings
    audio_sample_rate: int = 16000
    audio_bit_depth: int = 16
    audio_chunk_duration: float = 2.0  # seconds

    # Translation settings
    default_target_language: str = "zh"
    enable_translation_cache: bool = Field(True, env='ENABLE_CACHE')
    cache_ttl: int = Field(3600, env='CACHE_TTL')  # seconds

    # Performance settings
    max_retries: int = 3
    retry_min_wait: int = 2  # seconds
    retry_max_wait: int = 10  # seconds
    request_timeout: int = 30  # seconds

    # WebSocket settings
    websocket_heartbeat_interval: int = 30  # seconds
    websocket_max_reconnect_attempts: int = 5

    # Logging
    log_level: str = Field("INFO", env='LOG_LEVEL')

    # Rate limiting
    rate_limit_per_minute: int = Field(60, env='RATE_LIMIT')

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Create global settings instance
settings = Settings()
