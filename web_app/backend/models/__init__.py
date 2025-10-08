"""Data models and schemas for VoiceTrans."""
from .schemas import (
    LanguageInfo,
    ConfigRequest,
    TranslationResponse,
    TranslationEntry,
    StreamMessage,
    ErrorResponse,
    StatsResponse
)

__all__ = [
    'LanguageInfo',
    'ConfigRequest',
    'TranslationResponse',
    'TranslationEntry',
    'StreamMessage',
    'ErrorResponse',
    'StatsResponse'
]
