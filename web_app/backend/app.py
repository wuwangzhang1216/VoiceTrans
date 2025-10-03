#!/usr/bin/env python3
"""
FastAPI backend for VoiceTrans - Working Version without CORS Middleware
"""

from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

# Create the FastAPI app
app = FastAPI(title="VoiceTrans API", version="1.0.0")

# Models
class ConfigRequest(BaseModel):
    fireworks_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_target_language: Optional[str] = "zh"

# Global data
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
}

stats = {
    'total_translations': 0,
    'total_words': 0,
    'avg_latency': 0.0,
    'total_latency': 0.0,
    'api_calls': 0,
    'api_errors': 0
}

is_initialized = False

# CORS Headers
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

# Endpoints
@app.get("/")
async def root():
    return JSONResponse(
        content={
            "status": "online",
            "service": "VoiceTrans API",
            "version": "1.0.0",
            "initialized": is_initialized,
            "stats": stats
        },
        headers=CORS_HEADERS
    )

@app.options("/")
async def root_options():
    return JSONResponse(content={}, headers=CORS_HEADERS)

@app.get("/languages")
async def get_languages():
    return JSONResponse(
        content=[
            {"code": code, "name": info[0], "flag": info[1]}
            for code, info in LANGUAGES.items()
        ],
        headers=CORS_HEADERS
    )

@app.options("/languages")
async def languages_options():
    return JSONResponse(content={}, headers=CORS_HEADERS)

@app.get("/stats")
async def get_stats():
    return JSONResponse(content=stats, headers=CORS_HEADERS)

@app.options("/stats")
async def stats_options():
    return JSONResponse(content={}, headers=CORS_HEADERS)

@app.post("/config")
async def update_config(config: ConfigRequest):
    global is_initialized
    if config.fireworks_api_key or config.gemini_api_key:
        is_initialized = True
    return JSONResponse(
        content={"status": "configured", "initialized": is_initialized},
        headers=CORS_HEADERS
    )

@app.options("/config")
async def config_options():
    return JSONResponse(content={}, headers=CORS_HEADERS)

@app.post("/translate")
async def translate_audio(file: UploadFile = File(...), target_language: str = "zh"):
    audio_data = await file.read()

    # Mock response
    stats['total_translations'] += 1
    stats['api_calls'] += 1

    return JSONResponse(
        content={
            "transcription": "Test transcription",
            "translation": "测试转录",
            "target_language": target_language,
            "latency": 0.5,
            "processing_speed": 2.0,
            "timestamp": datetime.now().isoformat()
        },
        headers=CORS_HEADERS
    )

@app.options("/translate")
async def translate_options():
    return JSONResponse(content={}, headers=CORS_HEADERS)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)