"""
Pydantic models and schemas for API requests and responses
"""
from datetime import datetime
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class LanguageInfo(BaseModel):
    """Language information model"""
    code: str = Field(..., description="ISO 639-1 language code")
    name: str = Field(..., description="Language name in English")
    flag: str = Field(..., description="Flag emoji")


class ConfigRequest(BaseModel):
    """API configuration request"""
    fireworks_api_key: Optional[str] = Field(None, description="Fireworks AI API key")
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini API key")
    default_target_language: Optional[str] = Field("zh", description="Default target language code")


class TranslationEntry(BaseModel):
    """Individual translation entry"""
    id: str = Field(..., description="Unique identifier")
    transcription: str = Field(..., description="Original transcription")
    translation: str = Field(..., description="Translated text")
    source_language: Optional[str] = Field(None, description="Detected source language")
    target_language: str = Field(..., description="Target language code")
    timestamp: str = Field(..., description="ISO format timestamp")
    latency: float = Field(..., description="Processing latency in seconds")
    processing_speed: float = Field(..., description="Words per second")
    is_active: bool = Field(False, description="Whether this is the current active translation")


class TranslationResponse(BaseModel):
    """Translation API response"""
    transcription: str = Field(..., description="Original transcription")
    translation: str = Field(..., description="Translated text")
    source_language: Optional[str] = Field(None, description="Detected source language")
    target_language: str = Field(..., description="Target language code")
    latency: float = Field(..., description="Processing latency in seconds")
    processing_speed: float = Field(..., description="Words per second")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    cached: bool = Field(False, description="Whether result was from cache")


class StreamMessage(BaseModel):
    """WebSocket stream message"""
    type: Literal["transcription", "translation", "error", "ping", "pong", "status"] = Field(
        ..., description="Message type"
    )
    data: Optional[Dict[str, Any]] = Field(None, description="Message payload")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class StatsResponse(BaseModel):
    """Translation statistics response"""
    total_translations: int = Field(0, description="Total number of translations")
    total_words: int = Field(0, description="Total words processed")
    avg_latency: float = Field(0.0, description="Average processing latency")
    total_latency: float = Field(0.0, description="Total processing time")
    api_calls: int = Field(0, description="Total API calls made")
    api_errors: int = Field(0, description="Total API errors")
    cache_hits: int = Field(0, description="Number of cache hits")
    cache_misses: int = Field(0, description="Number of cache misses")
    uptime: float = Field(0.0, description="Service uptime in seconds")


class AudioChunk(BaseModel):
    """Audio chunk metadata"""
    sample_rate: int = Field(16000, description="Audio sample rate in Hz")
    channels: int = Field(1, description="Number of audio channels")
    bit_depth: int = Field(16, description="Bit depth")
    duration: float = Field(..., description="Duration in seconds")
    size_bytes: int = Field(..., description="Size in bytes")
