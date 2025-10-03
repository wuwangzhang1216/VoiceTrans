#!/usr/bin/env python3
"""
FastAPI backend for VoiceTrans Web Application
Provides REST API and WebSocket endpoints for real-time voice translation
"""

import os
import sys
import json
import asyncio
import io
import wave
import tempfile
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from concurrent.futures import ThreadPoolExecutor

# FastAPI and related
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# OpenAI SDK for Fireworks
from openai import OpenAI

# Google Gemini for translation
try:
    from google import genai
except ImportError:
    genai = None

# Initialize FastAPI app
app = FastAPI(
    title="VoiceTrans API",
    description="Real-time voice translation API powered by Fireworks and Google Gemini",
    version="1.0.0"
)

# CORS middleware - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=4)

# Pydantic models for request/response
class TranslationRequest(BaseModel):
    target_language: str = "zh"
    audio_format: Optional[str] = "wav"

class TranslationResponse(BaseModel):
    transcription: str
    translation: str
    target_language: str
    latency: float
    processing_speed: float
    timestamp: str

class LanguageInfo(BaseModel):
    code: str
    name: str
    flag: str

class ConfigRequest(BaseModel):
    fireworks_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_target_language: Optional[str] = "zh"

# Global state
class TranslationService:
    """Core translation service singleton"""

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
        self.fireworks_api_key = None
        self.gemini_api_key = None
        self.sample_rate = 16000
        self.whisper_model = "whisper-v3"
        self.is_initialized = False
        self.stats = {
            'total_translations': 0,
            'total_words': 0,
            'avg_latency': 0.0,
            'total_latency': 0.0,
            'api_calls': 0,
            'api_errors': 0
        }
        self.load_config()

    def load_config(self):
        """Load configuration from environment or config file"""
        # Try environment variables first
        self.fireworks_api_key = os.getenv('FIREWORKS_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')

        # Try config file
        config_path = Path('config.json')
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    self.fireworks_api_key = self.fireworks_api_key or config.get('fireworks_api_key')
                    self.gemini_api_key = self.gemini_api_key or config.get('gemini_api_key')
            except Exception as e:
                print(f"Warning: Could not load config.json: {e}")

    def initialize_clients(self):
        """Initialize API clients"""
        if self.fireworks_api_key:
            try:
                self.fireworks_client = OpenAI(
                    base_url="https://audio-prod.us-virginia-1.direct.fireworks.ai/v1",
                    api_key=self.fireworks_api_key
                )
                self.is_initialized = True
            except Exception as e:
                print(f"Failed to initialize Fireworks client: {e}")
                self.fireworks_client = None

        if self.gemini_api_key and genai:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
            except Exception as e:
                print(f"Failed to initialize Gemini client: {e}")
                self.gemini_client = None

    async def transcribe_audio(self, audio_data: bytes) -> str:
        """Transcribe audio using Fireworks API"""
        if not self.fireworks_client:
            raise HTTPException(status_code=503, detail="Transcription service not initialized")

        try:
            # Create WAV file in memory
            audio_buffer = io.BytesIO()
            with wave.open(audio_buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_data)

            wav_bytes = audio_buffer.getvalue()

            # Call Fireworks API
            transcription = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self.fireworks_client.audio.transcriptions.create(
                    model=self.whisper_model,
                    file=("audio.wav", wav_bytes, "audio/wav")
                )
            )

            # Extract text from response
            if hasattr(transcription, 'text'):
                text = transcription.text.strip()
            else:
                text = str(transcription).strip()

            self.stats['api_calls'] += 1
            return text

        except Exception as e:
            self.stats['api_errors'] += 1
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    async def translate_text(self, text: str, target_language: str) -> str:
        """Translate text using Google Gemini"""
        if not self.gemini_client:
            return text  # Return original text if translation not available

        try:
            language_name = self.LANGUAGES.get(target_language, ('Unknown', ''))[0]
            prompt = f"Translate the following text to {language_name}. Output only the translation, nothing else:\n\n{text}"

            # Use Gemini for translation
            response = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash-lite-preview-09-2025",
                    contents=prompt
                )
            )

            if response and response.text:
                return response.text.strip()
            return text

        except Exception as e:
            print(f"Translation error: {e}")
            return text

    async def process_audio(self, audio_data: bytes, target_language: str) -> Dict[str, Any]:
        """Process audio: transcribe and translate"""
        import time
        start_time = time.time()

        # Transcribe
        transcription = await self.transcribe_audio(audio_data)

        # Translate
        translation = await self.translate_text(transcription, target_language)

        # Calculate metrics
        latency = time.time() - start_time
        audio_duration = len(audio_data) / (self.sample_rate * 2)  # 2 bytes per sample
        processing_speed = audio_duration / latency if latency > 0 else 0

        # Update statistics
        self.stats['total_translations'] += 1
        self.stats['total_words'] += len(transcription.split())
        self.stats['total_latency'] += latency
        self.stats['avg_latency'] = self.stats['total_latency'] / self.stats['total_translations']

        return {
            'transcription': transcription,
            'translation': translation,
            'target_language': target_language,
            'latency': latency,
            'processing_speed': processing_speed,
            'timestamp': datetime.now().isoformat()
        }

# Initialize service
service = TranslationService()

# Dependency to ensure service is initialized
def get_service():
    if not service.is_initialized:
        service.initialize_clients()
    return service

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "status": "online",
        "service": "VoiceTrans API",
        "version": "1.0.0",
        "initialized": service.is_initialized,
        "stats": service.stats
    }

@app.get("/languages", response_model=List[LanguageInfo])
async def get_languages():
    """Get list of supported languages"""
    return [
        LanguageInfo(code=code, name=info[0], flag=info[1])
        for code, info in service.LANGUAGES.items()
    ]

@app.post("/config")
async def update_config(config: ConfigRequest):
    """Update API configuration"""
    if config.fireworks_api_key:
        service.fireworks_api_key = config.fireworks_api_key
    if config.gemini_api_key:
        service.gemini_api_key = config.gemini_api_key

    service.initialize_clients()

    return {
        "status": "configured",
        "initialized": service.is_initialized
    }

@app.post("/translate", response_model=TranslationResponse)
async def translate_audio(
    audio: UploadFile = File(...),
    target_language: str = "zh",
    _service: TranslationService = Depends(get_service)
):
    """Translate audio file"""
    # Read audio data
    audio_data = await audio.read()

    # Process audio
    result = await _service.process_audio(audio_data, target_language)

    return TranslationResponse(**result)

@app.get("/stats")
async def get_stats():
    """Get translation statistics"""
    return service.stats

# WebSocket for real-time translation
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time audio streaming"""
    await websocket.accept()
    _service = get_service()

    try:
        audio_buffer = bytearray()
        chunk_size = 16000 * 2  # 1 second of audio at 16kHz, 16-bit

        while True:
            # Receive audio data
            data = await websocket.receive_bytes()

            # Add to buffer
            audio_buffer.extend(data)

            # Process when we have enough data
            if len(audio_buffer) >= chunk_size:
                # Extract chunk
                chunk = bytes(audio_buffer[:chunk_size])
                audio_buffer = audio_buffer[chunk_size:]

                # Get target language from client message
                text_data = await websocket.receive_text()
                config = json.loads(text_data) if text_data else {}
                target_language = config.get('target_language', 'zh')

                # Process audio
                try:
                    result = await _service.process_audio(chunk, target_language)
                    await websocket.send_json(result)
                except Exception as e:
                    await websocket.send_json({
                        'error': str(e),
                        'timestamp': datetime.now().isoformat()
                    })

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)