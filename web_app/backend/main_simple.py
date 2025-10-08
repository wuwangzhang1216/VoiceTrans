#!/usr/bin/env python3
"""
FastAPI backend for VoiceTrans Web Application - Simplified Version
"""

import os
import json
import asyncio
import io
import wave
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Try imports with fallbacks
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("Warning: OpenAI library not installed")

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    print("Warning: Google GenAI library not installed")

# Create FastAPI app first
app = FastAPI(
    title="VoiceTrans API",
    description="Real-time voice translation API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class LanguageInfo(BaseModel):
    code: str
    name: str
    flag: str

class ConfigRequest(BaseModel):
    fireworks_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_target_language: Optional[str] = "zh"

class TranslationResponse(BaseModel):
    transcription: str
    translation: str
    target_language: str
    latency: float
    processing_speed: float
    timestamp: str

# Simple translation service
class SimpleTranslationService:
    LANGUAGES = {
        'en': ('English', '🇬🇧'),
        'zh': ('Chinese', '🇨🇳'),
        'es': ('Spanish', '🇪🇸'),
        'fr': ('French', '🇫🇷'),
        'de': ('German', '🇩🇪'),
        'ja': ('Japanese', '🇯🇵'),
        'ko': ('Korean', '🇰🇷'),
        'ru': ('Russian', '🇷🇺'),
        'ar': ('Arabic', '🇸🇦'),
        'pt': ('Portuguese', '🇵🇹'),
        'it': ('Italian', '🇮🇹'),
        'hi': ('Hindi', '🇮🇳'),
        'nl': ('Dutch', '🇳🇱'),
        'pl': ('Polish', '🇵🇱'),
        'tr': ('Turkish', '🇹🇷'),
        'sv': ('Swedish', '🇸🇪'),
        'da': ('Danish', '🇩🇰'),
        'no': ('Norwegian', '🇳🇴'),
        'fi': ('Finnish', '🇫🇮')
    }

    def __init__(self):
        self.fireworks_client = None
        self.gemini_client = None
        self.is_initialized = False
        self.stats = {
            'total_translations': 0,
            'total_words': 0,
            'avg_latency': 0.0,
            'total_latency': 0.0,
            'api_calls': 0,
            'api_errors': 0
        }

    def initialize(self, fireworks_key: Optional[str] = None, gemini_key: Optional[str] = None):
        """Initialize API clients"""
        if fireworks_key and HAS_OPENAI:
            try:
                self.fireworks_client = OpenAI(
                    base_url="https://audio-prod.us-virginia-1.direct.fireworks.ai/v1",
                    api_key=fireworks_key
                )
                self.is_initialized = True
                print("Fireworks client initialized")
            except Exception as e:
                print(f"Failed to initialize Fireworks: {e}")

        if gemini_key and HAS_GENAI:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                print("Gemini client initialized")
            except Exception as e:
                print(f"Failed to initialize Gemini: {e}")

# Create service instance
service = SimpleTranslationService()

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "status": "online",
        "service": "VoiceTrans API",
        "version": "1.0.0",
        "initialized": service.is_initialized,
        "stats": service.stats,
        "has_openai": HAS_OPENAI,
        "has_genai": HAS_GENAI
    }

@app.get("/languages")
async def get_languages():
    """Get list of supported languages"""
    return [
        {
            "code": code,
            "name": info[0],
            "flag": info[1]
        }
        for code, info in service.LANGUAGES.items()
    ]

@app.get("/stats")
async def get_stats():
    """Get translation statistics"""
    return service.stats

@app.post("/config")
async def update_config(config: ConfigRequest):
    """Update API configuration"""
    try:
        service.initialize(
            fireworks_key=config.fireworks_api_key,
            gemini_key=config.gemini_api_key
        )
        return {
            "status": "configured",
            "initialized": service.is_initialized
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "initialized": service.is_initialized
        }

@app.post("/translate")
async def translate_audio(
    file: UploadFile = File(...),
    target_language: str = "zh"
):
    """Translate audio file - mock implementation for testing"""
    # For testing, return mock data
    audio_data = await file.read()

    # Mock response
    return {
        "transcription": "This is a test transcription",
        "translation": "这是一个测试转录",
        "target_language": target_language,
        "latency": 0.5,
        "processing_speed": 2.0,
        "timestamp": datetime.now().isoformat()
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time audio streaming"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)