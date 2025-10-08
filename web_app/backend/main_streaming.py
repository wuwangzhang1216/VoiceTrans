#!/usr/bin/env python3
"""
FastAPI backend for VoiceTrans - Continuous streaming version
Processes audio in real-time without waiting for silence
"""

import os
import json
import asyncio
import io
import wave
import time
import base64
import tempfile
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from collections import deque
import threading
import queue

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Audio processing
try:
    import webrtcvad
    HAS_VAD = True
except ImportError:
    HAS_VAD = False
    print("Warning: webrtcvad not installed")

# Fireworks AI via OpenAI client
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("Warning: OpenAI library not installed")

# Google Gemini for translation
try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    print("Warning: Google GenAI library not installed")

# Create FastAPI app
app = FastAPI(
    title="VoiceTrans Streaming API",
    description="Continuous real-time voice translation API",
    version="3.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.vtranslab.com",  # Production frontend
        "https://vtranslab.com",  # Production frontend (without www)
        "http://localhost:3000",  # Local development
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConfigRequest(BaseModel):
    fireworks_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_target_language: Optional[str] = "zh"

class StreamingTranslationService:
    """Continuous streaming translation service"""

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
        'hi': ('Hindi', '🇮🇳')
    }

    def __init__(self):
        self.fireworks_client = None
        self.gemini_client = None
        self.is_initialized = False

        # Audio settings
        self.sample_rate = 16000
        self.chunk_duration = 2.0  # Process 2 seconds of audio at a time
        self.overlap_duration = 0.5  # Overlap between chunks

        # VAD for speech detection
        if HAS_VAD:
            self.vad = webrtcvad.Vad(2)  # Moderate aggressive
        else:
            self.vad = None

        # Stats
        self.stats = {
            'total_translations': 0,
            'total_words': 0,
            'avg_latency': 0.0,
            'total_latency': 0.0,
            'api_calls': 0,
            'api_errors': 0,
            'active_connections': 0
        }

        self.active_connections: List[WebSocket] = []

    def initialize(self, fireworks_key: Optional[str] = None, gemini_key: Optional[str] = None):
        """Initialize API clients"""
        success = False

        if fireworks_key and HAS_OPENAI:
            try:
                self.fireworks_client = OpenAI(
                    base_url="https://audio-prod.us-virginia-1.direct.fireworks.ai/v1",
                    api_key=fireworks_key
                )
                success = True
                print("Fireworks client initialized")
            except Exception as e:
                print(f"Failed to initialize Fireworks: {e}")

        if gemini_key and HAS_GENAI:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                print("Gemini client initialized")
            except Exception as e:
                print(f"Failed to initialize Gemini: {e}")

        self.is_initialized = success
        return success

    async def connect(self, websocket: WebSocket):
        """Add WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.stats['active_connections'] = len(self.active_connections)

    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.stats['active_connections'] = len(self.active_connections)

    async def process_audio_stream(self, audio_data: bytes, target_language: str = "zh") -> Optional[Dict]:
        """Process audio data and return translation immediately"""
        if not self.is_initialized or not self.fireworks_client:
            return None

        try:
            start_time = time.time()

            # Create WAV file in memory to avoid Windows file locking issues
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(audio_data)

            # Get WAV bytes
            wav_buffer.seek(0)
            wav_bytes = wav_buffer.read()

            # Transcribe with Fireworks using bytes directly
            transcription = self.fireworks_client.audio.transcriptions.create(
                model="whisper-v3",
                file=("audio.wav", wav_bytes, "audio/wav"),
                response_format="text"
            )

            # Get text from transcription
            if hasattr(transcription, 'text'):
                text = transcription.text.strip()
            else:
                text = str(transcription).strip()

            if not text:
                return None

            # Always translate to target language
            translation = text
            if self.gemini_client:
                try:
                    lang_name = self.LANGUAGES.get(target_language, (target_language, ''))[0]
                    prompt = f"Translate this to {lang_name}, output only the translation, nothing else: {text}"

                    response = self.gemini_client.models.generate_content(
                        model="gemini-2.5-flash-lite",  # Use gemini-2.5-flash-lite as requested
                        contents=prompt
                    )
                    translation = response.text.strip()
                except Exception as e:
                    print(f"Translation error: {e}")
                    translation = text

            # Calculate metrics
            latency = time.time() - start_time
            audio_duration = len(audio_data) / (self.sample_rate * 2)
            processing_speed = audio_duration / latency if latency > 0 else 0

            # Update stats
            self.stats['total_translations'] += 1
            self.stats['total_words'] += len(text.split())
            self.stats['total_latency'] += latency
            self.stats['avg_latency'] = self.stats['total_latency'] / self.stats['total_translations']
            self.stats['api_calls'] += 1

            return {
                "transcription": text,
                "translation": translation,
                "target_language": target_language,
                "latency": round(latency, 3),
                "processing_speed": round(processing_speed, 2),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"Processing error: {e}")
            self.stats['api_errors'] += 1
            return None

# Create service instance
service = StreamingTranslationService()

# Initialize service on module load
def initialize_service():
    """Initialize service configuration - prioritize environment variables"""
    # Try environment variables first (Heroku config vars)
    fireworks_key = os.getenv('FIREWORKS_API_KEY')
    gemini_key = os.getenv('GEMINI_API_KEY')

    if fireworks_key and gemini_key:
        service.initialize(fireworks_key=fireworks_key, gemini_key=gemini_key)
        print("✅ Configuration loaded from environment variables (Heroku Config Vars)")
        return

    # Fallback to config.json if environment variables not set
    config_path = Path("config.json")
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                service.initialize(
                    fireworks_key=config.get('fireworks_api_key'),
                    gemini_key=config.get('gemini_api_key')
                )
                print("⚠️  Configuration loaded from config.json (fallback)")
        except Exception as e:
            print(f"❌ Failed to load config: {e}")

# Initialize on module load
initialize_service()
print(f"Service initialized: {service.is_initialized}")
print(f"Fireworks client: {service.fireworks_client is not None}")
print(f"Gemini client: {service.gemini_client is not None}")

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "status": "online",
        "service": "VoiceTrans Streaming API",
        "version": "3.0.0",
        "initialized": service.is_initialized,
        "stats": service.stats,
        "features": {
            "continuous_streaming": True,
            "vad": HAS_VAD,
            "fireworks": HAS_OPENAI,
            "gemini": HAS_GENAI
        }
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
        success = service.initialize(
            fireworks_key=config.fireworks_api_key,
            gemini_key=config.gemini_api_key
        )

        # Save config to file
        config_data = {
            'fireworks_api_key': config.fireworks_api_key or '',
            'gemini_api_key': config.gemini_api_key or '',
            'default_target_language': config.default_target_language
        }

        with open('config.json', 'w') as f:
            json.dump(config_data, f, indent=2)

        return {
            "status": "configured" if success else "failed",
            "initialized": service.is_initialized
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for continuous audio streaming"""
    await service.connect(websocket)

    # Audio buffer for continuous processing
    audio_buffer = bytearray()
    processing_task = None
    target_language = "zh"
    last_process_time = time.time()
    min_audio_length = int(service.sample_rate * 2 * 2.0)  # 2 seconds minimum
    max_audio_length = int(service.sample_rate * 2 * 5.0)  # 5 seconds maximum

    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "message": "Continuous streaming ready",
            "initialized": service.is_initialized
        })

        while True:
            # Receive message from client
            message = await websocket.receive_json()

            if message.get("type") == "audio":
                # Handle audio data
                audio_base64 = message.get("data")
                new_target = message.get("target_language")

                # Debug: Print current and new target language
                if new_target:
                    print(f"Current target: {target_language}, New target: {new_target}")

                # If language changed, process current buffer immediately and clear it
                if new_target and new_target != target_language:
                    print(f"Language changed from {target_language} to {new_target}")

                    # Process any buffered audio with old language if we have enough
                    if len(audio_buffer) >= min_audio_length:
                        audio_chunk = bytes(audio_buffer)
                        audio_buffer.clear()

                        await websocket.send_json({
                            "type": "processing",
                            "message": "Processing audio..."
                        })

                        result = await service.process_audio_stream(audio_chunk, target_language)
                        if result:
                            await websocket.send_json({
                                "type": "translation",
                                **result
                            })
                    else:
                        # Clear buffer if not enough audio
                        audio_buffer.clear()

                    # Update to new language
                    target_language = new_target
                    last_process_time = time.time()

                if audio_base64:
                    # Decode base64 audio
                    audio_bytes = base64.b64decode(audio_base64)
                    audio_buffer.extend(audio_bytes)

                    # Log for debugging
                    if len(audio_buffer) % 16000 == 0:  # Log every ~0.5 seconds
                        print(f"Audio buffer: {len(audio_buffer)} bytes ({len(audio_buffer)/32000:.1f}s)")

                    current_time = time.time()
                    time_since_last = current_time - last_process_time

                    # Process audio when we have enough data
                    should_process = False

                    # Process if we have at least 2 seconds of audio and 1.5 seconds have passed
                    if len(audio_buffer) >= min_audio_length and time_since_last >= 1.5:
                        should_process = True
                        print(f"Processing: {len(audio_buffer)} bytes after {time_since_last:.1f}s")
                    # Or if buffer is getting too large (3 seconds)
                    elif len(audio_buffer) >= max_audio_length:
                        should_process = True
                        print(f"Processing: buffer full at {len(audio_buffer)} bytes")

                    if should_process:
                        # Take chunk for processing
                        chunk_size = min(len(audio_buffer), max_audio_length)
                        audio_chunk = bytes(audio_buffer[:chunk_size])

                        # Keep some overlap for continuity (last 0.5 seconds)
                        overlap_size = int(service.sample_rate * 2 * 0.5)
                        if len(audio_buffer) > overlap_size:
                            audio_buffer = audio_buffer[chunk_size - overlap_size:]
                        else:
                            audio_buffer.clear()

                        last_process_time = current_time

                        # Send processing notification
                        await websocket.send_json({
                            "type": "processing",
                            "message": "Processing audio..."
                        })

                        # Process audio asynchronously
                        result = await service.process_audio_stream(audio_chunk, target_language)

                        if result:
                            # Send translation result
                            await websocket.send_json({
                                "type": "translation",
                                **result
                            })

            elif message.get("type") == "config":
                # Update configuration
                target_language = message.get("target_language", "zh")
                await websocket.send_json({
                    "type": "config_updated",
                    "target_language": target_language
                })

            elif message.get("type") == "ping":
                # Heartbeat
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })

    except WebSocketDisconnect:
        service.disconnect(websocket)
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        service.disconnect(websocket)
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    # Heroku provides PORT environment variable
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)