#!/usr/bin/env python3
"""
FastAPI backend for VoiceTrans - Real-time streaming version with WebSocket
"""

import os
import json
import asyncio
import io
import wave
import time
import base64
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from collections import deque

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

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
    title="VoiceTrans Real-time API",
    description="Real-time voice translation API with WebSocket streaming",
    version="2.0.0"
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

# Real-time translation service
class RealtimeTranslationService:
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

        # VAD settings (similar to CLI)
        self.sample_rate = 16000
        self.chunk_size = 480  # 30ms chunks
        self.vad_level = 2  # Moderate aggressive VAD

        if HAS_VAD:
            self.vad = webrtcvad.Vad(self.vad_level)
        else:
            self.vad = None

        # Speech detection parameters (from CLI)
        self.silence_threshold = 25  # 750ms of silence
        self.min_speech_chunks = 10  # 300ms minimum speech
        self.max_recording_duration = 5  # 5s max

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

        # Active WebSocket connections
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

    async def process_audio_chunk(self, audio_data: bytes, target_language: str = "zh") -> Optional[Dict]:
        """Process audio chunk and return translation if speech detected"""
        if not self.is_initialized or not self.fireworks_client:
            return None

        try:
            start_time = time.time()

            # Create temporary WAV file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                # Write WAV header and data
                with wave.open(tmp_file.name, 'wb') as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(self.sample_rate)
                    wav_file.writeframes(audio_data)

                # Transcribe with Fireworks
                with open(tmp_file.name, 'rb') as audio_file:
                    transcription = self.fireworks_client.audio.transcriptions.create(
                        model="whisper-v3",
                        file=audio_file,
                        response_format="text"
                    )

                # Clean up temp file
                os.unlink(tmp_file.name)

            if not transcription or transcription.strip() == "":
                return None

            # Translate if needed
            translation = transcription
            if target_language != "en" and self.gemini_client:
                try:
                    lang_name = self.LANGUAGES.get(target_language, (target_language, ''))[0]
                    prompt = f"Translate this to {lang_name}: {transcription}"

                    response = self.gemini_client.models.generate_content(
                        model="gemini-2.0-flash-exp",
                        config={"response_modalities": ["TEXT"], "temperature": 0},
                        contents=prompt
                    )
                    translation = response.text.strip()
                except Exception as e:
                    print(f"Translation error: {e}")
                    translation = transcription

            # Calculate metrics
            latency = time.time() - start_time
            audio_duration = len(audio_data) / (self.sample_rate * 2)  # 16-bit audio
            processing_speed = audio_duration / latency if latency > 0 else 0

            # Update stats
            self.stats['total_translations'] += 1
            self.stats['total_words'] += len(transcription.split())
            self.stats['total_latency'] += latency
            self.stats['avg_latency'] = self.stats['total_latency'] / self.stats['total_translations']
            self.stats['api_calls'] += 1

            return {
                "transcription": transcription,
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

    def is_speech(self, audio_chunk: bytes) -> bool:
        """Check if audio chunk contains speech using VAD"""
        if not self.vad or not HAS_VAD:
            return True  # If no VAD, assume all audio is speech

        try:
            return self.vad.is_speech(audio_chunk, self.sample_rate)
        except Exception:
            return True

# Create service instance
service = RealtimeTranslationService()

# Initialize service on module load
def initialize_service():
    """Initialize service configuration"""
    config_path = Path("config.json")
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                service.initialize(
                    fireworks_key=config.get('fireworks_api_key'),
                    gemini_key=config.get('gemini_api_key')
                )
                print("Configuration loaded from config.json")
        except Exception as e:
            print(f"Failed to load config: {e}")

    # Try environment variables
    if not service.is_initialized:
        fireworks_key = os.getenv('FIREWORKS_API_KEY')
        gemini_key = os.getenv('GEMINI_API_KEY')
        if fireworks_key:
            service.initialize(fireworks_key=fireworks_key, gemini_key=gemini_key)
            print("Configuration loaded from environment variables")

# Initialize on module load
initialize_service()

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "status": "online",
        "service": "VoiceTrans Real-time API",
        "version": "2.0.0",
        "initialized": service.is_initialized,
        "stats": service.stats,
        "features": {
            "websocket": True,
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

@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    """WebSocket endpoint for real-time audio streaming and translation"""
    await service.connect(websocket)

    # Audio buffer for VAD
    audio_buffer = []
    speech_chunks = 0
    silence_chunks = 0
    is_recording = False
    recording_start = None

    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "message": "Real-time translation ready",
            "initialized": service.is_initialized
        })

        while True:
            # Receive message from client
            message = await websocket.receive_json()

            if message.get("type") == "audio":
                # Handle audio data
                audio_base64 = message.get("data")
                target_language = message.get("target_language", "zh")

                if audio_base64:
                    # Decode base64 audio
                    audio_bytes = base64.b64decode(audio_base64)

                    # Check for speech using VAD
                    if service.is_speech(audio_bytes):
                        speech_chunks += 1
                        silence_chunks = 0

                        if not is_recording and speech_chunks >= service.min_speech_chunks:
                            # Start recording
                            is_recording = True
                            recording_start = time.time()
                            audio_buffer = []

                            await websocket.send_json({
                                "type": "recording_started",
                                "message": "Speech detected"
                            })

                        if is_recording:
                            audio_buffer.append(audio_bytes)
                    else:
                        silence_chunks += 1

                        if is_recording:
                            audio_buffer.append(audio_bytes)

                            # Check for end of speech
                            if silence_chunks >= service.silence_threshold:
                                # Process accumulated audio
                                is_recording = False
                                speech_chunks = 0
                                silence_chunks = 0

                                if audio_buffer:
                                    # Combine audio chunks
                                    full_audio = b''.join(audio_buffer)

                                    # Send processing status
                                    await websocket.send_json({
                                        "type": "processing",
                                        "message": "Processing speech..."
                                    })

                                    # Process audio
                                    result = await service.process_audio_chunk(full_audio, target_language)

                                    if result:
                                        await websocket.send_json({
                                            "type": "translation",
                                            **result
                                        })
                                    else:
                                        await websocket.send_json({
                                            "type": "error",
                                            "message": "No speech detected or processing failed"
                                        })

                                    audio_buffer = []

                    # Check for max recording duration
                    if is_recording and recording_start:
                        if time.time() - recording_start > service.max_recording_duration:
                            # Force process if recording too long
                            is_recording = False
                            speech_chunks = 0
                            silence_chunks = 0

                            if audio_buffer:
                                full_audio = b''.join(audio_buffer)
                                result = await service.process_audio_chunk(full_audio, target_language)

                                if result:
                                    await websocket.send_json({
                                        "type": "translation",
                                        **result
                                    })

                                audio_buffer = []

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
    uvicorn.run(app, host="0.0.0.0", port=8001)