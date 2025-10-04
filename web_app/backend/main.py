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
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# Initialize with environment variables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize API with environment variables on startup"""
    fireworks_key = os.getenv("FIREWORKS_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if fireworks_key or gemini_key:
        service.initialize(
            fireworks_key=fireworks_key,
            gemini_key=gemini_key
        )
        print(f"Service initialized on startup: fireworks={bool(fireworks_key)}, gemini={bool(gemini_key)}")
    else:
        print("Warning: No API keys found in environment variables")

    # Debug frontend path
    frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
    print(f"[STARTUP] Looking for frontend at: {frontend_dist.absolute()}")
    print(f"[STARTUP] Frontend exists: {frontend_dist.exists()}")
    print(f"[STARTUP] Current working directory: {os.getcwd()}")
    print(f"[STARTUP] __file__ location: {Path(__file__).absolute()}")

# API Endpoints
@app.get("/api")
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

@app.get("/api/languages")
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

@app.get("/api/health")
async def health_check():
    """Health check endpoint for load balancer"""
    return {"status": "healthy"}

@app.get("/api/stats")
async def get_stats():
    """Get translation statistics"""
    return service.stats

@app.post("/api/config")
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

@app.post("/api/translate")
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

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time audio streaming"""
    from starlette.websockets import WebSocketDisconnect
    import struct

    await websocket.accept()

    # Send connected message
    await websocket.send_json({"type": "connected", "message": "WebSocket connected"})

    audio_buffer = bytearray()
    last_process_time = time.time()
    silence_threshold = 0.01  # Threshold for detecting silence
    min_audio_duration = 3.0  # Minimum 3 seconds of audio before processing
    max_audio_duration = 10.0  # Maximum 10 seconds before forcing processing

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "audio":
                # Accumulate audio data
                audio_data = message.get("data", "")
                target_language = message.get("target_language", "en")

                # Decode base64 audio
                audio_bytes = base64.b64decode(audio_data)
                audio_buffer.extend(audio_bytes)

                # Calculate current buffer duration
                buffer_duration = len(audio_buffer) / (16000 * 2)  # 16kHz, 16-bit (2 bytes per sample)

                # Check if we should process
                should_process = False

                # Force process if buffer is too long
                if buffer_duration >= max_audio_duration:
                    should_process = True

                # Process if we have minimum duration and detect silence
                elif buffer_duration >= min_audio_duration:
                    # Check last 0.5 seconds for silence
                    check_samples = min(16000, len(audio_bytes) // 2)  # 0.5 seconds or less
                    if check_samples > 0:
                        # Calculate RMS energy of recent audio
                        recent_audio = audio_bytes[-check_samples*2:]
                        samples = struct.unpack(f'<{len(recent_audio)//2}h', recent_audio)
                        rms = (sum(s*s for s in samples) / len(samples)) ** 0.5
                        normalized_rms = rms / 32768.0  # Normalize to 0-1

                        # If recent audio is silent, process what we have
                        if normalized_rms < silence_threshold:
                            should_process = True

                if should_process and len(audio_buffer) > 16000:  # At least 0.5 seconds
                    await websocket.send_json({"type": "processing"})

                    start_time = time.time()

                    # Create WAV file in memory
                    wav_buffer = io.BytesIO()
                    with wave.open(wav_buffer, 'wb') as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)  # 16-bit
                        wav_file.setframerate(16000)
                        wav_file.writeframes(bytes(audio_buffer))

                    wav_buffer.seek(0)

                    # Transcribe with Fireworks
                    transcription = ""
                    if service.fireworks_client:
                        try:
                            response = service.fireworks_client.audio.transcriptions.create(
                                model="whisper-v3",
                                file=("audio.wav", wav_buffer.getvalue(), "audio/wav")
                            )
                            transcription = response.text
                        except Exception as e:
                            print(f"Transcription error: {e}")
                            transcription = "[Transcription failed]"

                    # Translate with Gemini
                    translation = ""
                    if service.gemini_client and transcription and transcription != "[Transcription failed]":
                        try:
                            target_lang = service.LANGUAGES.get(target_language, (target_language, ''))[0]
                            response = service.gemini_client.models.generate_content(
                                model='gemini-2.0-flash-exp',
                                contents=f"Translate the following text to {target_lang}: {transcription}"
                            )
                            translation = response.text
                        except Exception as e:
                            print(f"Translation error: {e}")
                            translation = "[Translation failed]"

                    latency = time.time() - start_time

                    # Calculate processing speed (audio duration / processing time)
                    audio_duration = len(audio_buffer) / (16000 * 2)  # 16kHz, 16-bit
                    processing_speed = audio_duration / latency if latency > 0 else 1.0

                    # Send translation result
                    await websocket.send_json({
                        "type": "translation",
                        "transcription": transcription,
                        "translation": translation,
                        "timestamp": datetime.now().isoformat(),
                        "latency": latency,
                        "processing_speed": processing_speed
                    })

                    # Clear buffer
                    audio_buffer.clear()

    except WebSocketDisconnect:
        print("WebSocket disconnected normally")
    except Exception as e:
        print(f"WebSocket error: {e}")

# Serve static files for frontend
from fastapi.responses import FileResponse, Response

# Calculate frontend path - try multiple locations
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
print(f"Looking for frontend at: {frontend_dist.absolute()}")
print(f"Frontend exists: {frontend_dist.exists()}")

# List parent directory to debug
parent = Path(__file__).parent.parent
if parent.exists():
    print(f"Parent directory contents: {list(parent.iterdir())}")

# Serve static assets (CSS, JS, images, etc.)
if frontend_dist.exists():
    # Mount assets folder for CSS/JS
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    # Serve specific static files
    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(frontend_dist / "favicon.svg")

    @app.get("/logo.svg")
    async def logo():
        return FileResponse(frontend_dist / "logo.svg")

    # Handle common missing files to prevent 404 errors
    @app.get("/manifest.json")
    async def manifest():
        return {"name": "VoiceTrans", "short_name": "VoiceTrans", "start_url": "/"}

    @app.get("/robots.txt")
    async def robots():
        return Response(content="User-agent: *\nAllow: /", media_type="text/plain")

    # Serve index.html for root and all other routes (SPA)
    @app.get("/")
    async def root_frontend():
        """Serve frontend index at root"""
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend for all non-API routes"""
        # Check if it's a file request
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(frontend_dist / "index.html")

    print(f"✅ Serving frontend from: {frontend_dist}")
else:
    print(f"❌ Warning: Frontend dist directory not found at {frontend_dist}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)