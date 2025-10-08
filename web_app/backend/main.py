#!/usr/bin/env python3
"""
VoiceTrans API - Refactored Backend
Real-time voice translation with optimized architecture
"""
import logging
import time
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, WebSocket, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config.settings import settings
from models.schemas import (
    LanguageInfo,
    ConfigRequest,
    StatsResponse,
    ErrorResponse
)
from services.transcription import TranscriptionService
from services.translation import TranslationService
from services.streaming import StreamingService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Real-time voice translation API with optimized performance",
    version=settings.app_version,
    debug=settings.debug
)

# Add rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if not settings.debug else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global service instances
transcription_service: Optional[TranscriptionService] = None
translation_service: Optional[TranslationService] = None
streaming_service: Optional[StreamingService] = None

# Track application start time
app_start_time = time.time()


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global transcription_service, translation_service, streaming_service

    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")

    # Initialize transcription service
    transcription_service = TranscriptionService()
    if transcription_service.initialize():
        logger.info("Transcription service initialized")
    else:
        logger.warning("Transcription service initialization failed - will require runtime config")

    # Initialize translation service
    translation_service = TranslationService()
    if translation_service.initialize():
        logger.info("Translation service initialized")
    else:
        logger.warning("Translation service initialization failed - will require runtime config")

    # Initialize streaming service
    if transcription_service and translation_service:
        streaming_service = StreamingService(
            transcription_service,
            translation_service
        )
        logger.info("Streaming service initialized")

    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Application shutting down")


# API Endpoints

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API status and health check"""
    uptime = time.time() - app_start_time

    return {
        "status": "online",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "uptime_seconds": uptime,
        "timestamp": datetime.now().isoformat(),
        "services": {
            "transcription": transcription_service is not None and transcription_service.client is not None,
            "translation": translation_service is not None and translation_service.client is not None,
            "streaming": streaming_service is not None
        }
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    is_healthy = (
        transcription_service is not None
        and translation_service is not None
        and streaming_service is not None
    )

    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "healthy": is_healthy,
        "timestamp": datetime.now().isoformat(),
        "services": {
            "transcription": {
                "initialized": transcription_service is not None,
                "client_ready": transcription_service.client is not None if transcription_service else False
            },
            "translation": {
                "initialized": translation_service is not None,
                "client_ready": translation_service.client is not None if translation_service else False
            },
            "streaming": {
                "initialized": streaming_service is not None
            }
        }
    }, status_code


@app.get("/languages", response_model=list[LanguageInfo], tags=["Languages"])
async def get_languages(request: Request):
    """Get list of supported languages"""
    return TranslationService.get_languages()


@app.get("/v1/languages", response_model=list[LanguageInfo], tags=["Languages"])
async def get_languages_v1(request: Request):
    """Get list of supported languages (v1 API)"""
    return TranslationService.get_languages()


@app.get("/stats", tags=["Statistics"])
async def get_stats_legacy(request: Request):
    """Get comprehensive translation statistics (legacy endpoint)"""
    return await get_stats_v1(request)


@app.get("/v1/stats", response_model=StatsResponse, tags=["Statistics"])
async def get_stats_v1(request: Request):
    """Get comprehensive translation statistics"""
    if not transcription_service or not translation_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not initialized"
        )

    trans_stats = transcription_service.get_stats()
    transl_stats = translation_service.get_stats()

    uptime = time.time() - app_start_time

    return StatsResponse(
        total_translations=transl_stats.get('successful_requests', 0),
        total_words=0,
        avg_latency=(
            (trans_stats.get('avg_duration', 0) + transl_stats.get('avg_duration', 0)) / 2
        ),
        total_latency=trans_stats.get('total_duration', 0) + transl_stats.get('total_duration', 0),
        api_calls=trans_stats.get('total_requests', 0) + transl_stats.get('total_requests', 0),
        api_errors=trans_stats.get('failed_requests', 0) + transl_stats.get('failed_requests', 0),
        cache_hits=trans_stats.get('cache_hits', 0) + transl_stats.get('cache_hits', 0),
        cache_misses=trans_stats.get('cache_misses', 0) + transl_stats.get('cache_misses', 0),
        uptime=uptime
    )


@app.post("/config", tags=["Configuration"])
async def update_config_legacy(config: ConfigRequest, request: Request):
    """Update API configuration (legacy endpoint)"""
    return await update_config_v1(config, request)


@app.post("/v1/config", tags=["Configuration"])
async def update_config_v1(config: ConfigRequest, request: Request):
    """Update API configuration (API keys and settings)"""
    try:
        results = {}

        # Update transcription service
        if config.fireworks_api_key and transcription_service:
            success = transcription_service.initialize(config.fireworks_api_key)
            results['transcription'] = 'configured' if success else 'failed'

        # Update translation service
        if config.gemini_api_key and translation_service:
            success = translation_service.initialize(config.gemini_api_key)
            results['translation'] = 'configured' if success else 'failed'

        # Update default target language
        if config.default_target_language:
            results['default_language'] = config.default_target_language

        return {
            "status": "success",
            "results": results,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Configuration update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration update failed: {str(e)}"
        )


@app.delete("/v1/cache", tags=["Cache"])
async def clear_cache(request: Request):
    """Clear all service caches"""
    try:
        if transcription_service:
            transcription_service.clear_cache()

        if translation_service:
            translation_service.clear_cache()

        return {
            "status": "success",
            "message": "All caches cleared",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Cache clear failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache clear failed: {str(e)}"
        )


@app.websocket("/ws")
async def websocket_stream_legacy(websocket: WebSocket, client_id: Optional[str] = None):
    """WebSocket endpoint for real-time audio streaming (legacy)"""
    await websocket_stream_v1(websocket, client_id)


@app.websocket("/v1/ws/stream")
async def websocket_stream_v1(websocket: WebSocket, client_id: Optional[str] = None):
    """WebSocket endpoint for real-time audio streaming with heartbeat monitoring"""
    if not streaming_service:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    try:
        await streaming_service.handle_connection(websocket, client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass


@app.get("/v1/connections", tags=["Monitoring"])
async def get_connections(request: Request):
    """Get information about active WebSocket connections"""
    if not streaming_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Streaming service not initialized"
        )

    return streaming_service.get_stats()


@app.get("/v1/connections/{client_id}", tags=["Monitoring"])
async def get_connection_info(client_id: str, request: Request):
    """Get information about specific connection"""
    if not streaming_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Streaming service not initialized"
        )

    info = streaming_service.get_connection_info(client_id)

    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection {client_id} not found"
        )

    return info


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )