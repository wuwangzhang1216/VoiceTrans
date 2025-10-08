"""
Transcription service with retry and caching capabilities
"""
import asyncio
import hashlib
import logging
from typing import Optional, Dict
from datetime import datetime, timedelta

from openai import OpenAI, APIError, APIConnectionError, RateLimitError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from config.settings import settings
from utils.audio import AudioProcessor

logger = logging.getLogger(__name__)


class TranscriptionService:
    """
    Handles audio transcription using Fireworks AI (Whisper v3)
    with retry mechanism and optional caching
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.fireworks_api_key
        self.client: Optional[OpenAI] = None
        self.audio_processor = AudioProcessor()
        self.cache: Dict[str, tuple] = {}  # hash -> (transcription, timestamp)
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'total_duration': 0.0
        }

        if self.api_key:
            self.initialize()

    def initialize(self, api_key: Optional[str] = None):
        """Initialize Fireworks AI client"""
        if api_key:
            self.api_key = api_key

        if not self.api_key:
            logger.warning("No Fireworks API key provided")
            return False

        try:
            self.client = OpenAI(
                base_url=settings.fireworks_base_url,
                api_key=self.api_key
            )
            logger.info("Fireworks transcription client initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Fireworks client: {e}")
            return False

    def _calculate_audio_hash(self, audio_data: bytes) -> str:
        """Calculate hash of audio data for caching"""
        return hashlib.md5(audio_data).hexdigest()

    def _get_cached_transcription(self, audio_hash: str) -> Optional[str]:
        """Get transcription from cache if available and not expired"""
        if not settings.enable_translation_cache:
            return None

        if audio_hash in self.cache:
            transcription, timestamp = self.cache[audio_hash]
            age = datetime.now() - timestamp

            if age.total_seconds() < settings.cache_ttl:
                self.stats['cache_hits'] += 1
                logger.debug(f"Cache hit for audio hash {audio_hash[:8]}...")
                return transcription
            else:
                # Remove expired entry
                del self.cache[audio_hash]

        self.stats['cache_misses'] += 1
        return None

    def _cache_transcription(self, audio_hash: str, transcription: str):
        """Cache transcription result"""
        if settings.enable_translation_cache:
            self.cache[audio_hash] = (transcription, datetime.now())

            # Limit cache size (keep last 1000 entries)
            if len(self.cache) > 1000:
                # Remove oldest entries
                sorted_cache = sorted(
                    self.cache.items(),
                    key=lambda x: x[1][1]
                )
                self.cache = dict(sorted_cache[-1000:])

    @retry(
        stop=stop_after_attempt(settings.max_retries),
        wait=wait_exponential(
            multiplier=1,
            min=settings.retry_min_wait,
            max=settings.retry_max_wait
        ),
        retry=retry_if_exception_type((APIConnectionError, RateLimitError)),
        reraise=True
    )
    async def transcribe_audio(
        self,
        audio_data: bytes,
        language: Optional[str] = None,
        use_cache: bool = True
    ) -> tuple[str, float]:
        """
        Transcribe audio using Fireworks AI with retry mechanism

        Args:
            audio_data: Raw PCM audio data
            language: Optional language hint for transcription
            use_cache: Whether to use caching

        Returns:
            Tuple of (transcription_text, processing_time)

        Raises:
            APIError: If transcription fails after retries
        """
        start_time = datetime.now()
        self.stats['total_requests'] += 1

        if not self.client:
            raise ValueError("Transcription service not initialized")

        # Check cache
        if use_cache:
            audio_hash = self._calculate_audio_hash(audio_data)
            cached = self._get_cached_transcription(audio_hash)
            if cached:
                duration = (datetime.now() - start_time).total_seconds()
                return cached, duration

        try:
            # Preprocess audio
            processed_audio = self.audio_processor.preprocess_audio(audio_data)

            # Create WAV file in memory
            wav_buffer = self.audio_processor.create_wav_from_pcm(processed_audio)

            # Prepare request parameters
            transcription_params = {
                "model": "whisper-v3-turbo",
                "file": ("audio.wav", wav_buffer, "audio/wav"),
                "response_format": "text"
            }

            if language:
                transcription_params["language"] = language

            # Call Fireworks API (synchronous, run in executor)
            loop = asyncio.get_event_loop()
            transcription = await loop.run_in_executor(
                None,
                lambda: self.client.audio.transcriptions.create(**transcription_params)
            )

            transcription_text = transcription.strip()

            # Cache result
            if use_cache:
                self._cache_transcription(audio_hash, transcription_text)

            duration = (datetime.now() - start_time).total_seconds()
            self.stats['successful_requests'] += 1
            self.stats['total_duration'] += duration

            logger.info(
                f"Transcription successful: {len(transcription_text)} chars in {duration:.2f}s"
            )

            return transcription_text, duration

        except (APIConnectionError, RateLimitError) as e:
            logger.warning(f"Retryable error during transcription: {e}")
            raise  # Let tenacity handle retry

        except APIError as e:
            self.stats['failed_requests'] += 1
            logger.error(f"API error during transcription: {e}")
            raise

        except Exception as e:
            self.stats['failed_requests'] += 1
            logger.error(f"Unexpected error during transcription: {e}")
            raise

    def clear_cache(self):
        """Clear transcription cache"""
        self.cache.clear()
        logger.info("Transcription cache cleared")

    def get_stats(self) -> dict:
        """Get service statistics"""
        return {
            **self.stats,
            'cache_size': len(self.cache),
            'avg_duration': (
                self.stats['total_duration'] / self.stats['successful_requests']
                if self.stats['successful_requests'] > 0
                else 0.0
            )
        }
