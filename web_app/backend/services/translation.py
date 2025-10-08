"""
Translation service with caching and parallel processing
"""
import asyncio
import hashlib
import logging
from typing import Optional, Dict, Tuple
from datetime import datetime

from google import genai
from google.genai import types
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from config.settings import settings

logger = logging.getLogger(__name__)


class TranslationService:
    """
    Handles text translation using Google Gemini
    with caching and language detection
    """

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

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        self.client: Optional[genai.Client] = None
        self.cache: Dict[str, tuple] = {}  # hash -> (translation, timestamp)
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'skipped_same_language': 0,
            'total_duration': 0.0
        }

        if self.api_key:
            self.initialize()

    def initialize(self, api_key: Optional[str] = None):
        """Initialize Gemini client"""
        if api_key:
            self.api_key = api_key

        if not self.api_key:
            logger.warning("No Gemini API key provided")
            return False

        try:
            self.client = genai.Client(api_key=self.api_key)
            logger.info("Gemini translation client initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            return False

    def _calculate_cache_key(self, text: str, target_lang: str) -> str:
        """Calculate cache key from text and target language"""
        content = f"{text}:{target_lang}"
        return hashlib.md5(content.encode()).hexdigest()

    def _get_cached_translation(self, cache_key: str) -> Optional[str]:
        """Get translation from cache if available and not expired"""
        if not settings.enable_translation_cache:
            return None

        if cache_key in self.cache:
            translation, timestamp = self.cache[cache_key]
            age = datetime.now() - timestamp

            if age.total_seconds() < settings.cache_ttl:
                self.stats['cache_hits'] += 1
                logger.debug(f"Cache hit for translation {cache_key[:8]}...")
                return translation
            else:
                del self.cache[cache_key]

        self.stats['cache_misses'] += 1
        return None

    def _cache_translation(self, cache_key: str, translation: str):
        """Cache translation result"""
        if settings.enable_translation_cache:
            self.cache[cache_key] = (translation, datetime.now())

            # Limit cache size
            if len(self.cache) > 1000:
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
        reraise=True
    )
    async def detect_language(self, text: str) -> Optional[str]:
        """
        Detect language of text using Gemini

        Args:
            text: Text to analyze

        Returns:
            ISO 639-1 language code or None
        """
        if not self.client:
            return None

        try:
            prompt = f"""Detect the language of this text and respond with ONLY the ISO 639-1 two-letter language code (e.g., 'en', 'zh', 'es').
Text: {text}
Language code:"""

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=10
                    )
                )
            )

            detected_lang = response.text.strip().lower()[:2]

            if detected_lang in self.LANGUAGES:
                logger.debug(f"Detected language: {detected_lang}")
                return detected_lang

            return None

        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            return None

    @retry(
        stop=stop_after_attempt(settings.max_retries),
        wait=wait_exponential(
            multiplier=1,
            min=settings.retry_min_wait,
            max=settings.retry_max_wait
        ),
        reraise=True
    )
    async def translate_text(
        self,
        text: str,
        target_lang: str,
        source_lang: Optional[str] = None,
        use_cache: bool = True
    ) -> Tuple[str, float, bool]:
        """
        Translate text to target language

        Args:
            text: Text to translate
            target_lang: Target language code
            source_lang: Optional source language hint
            use_cache: Whether to use caching

        Returns:
            Tuple of (translated_text, processing_time, was_cached)

        Raises:
            ValueError: If translation service not initialized
        """
        start_time = datetime.now()
        self.stats['total_requests'] += 1

        if not self.client:
            raise ValueError("Translation service not initialized")

        if not text or not text.strip():
            return text, 0.0, False

        # Check cache
        if use_cache:
            cache_key = self._calculate_cache_key(text, target_lang)
            cached = self._get_cached_translation(cache_key)
            if cached:
                duration = (datetime.now() - start_time).total_seconds()
                return cached, duration, True

        try:
            # Detect source language if not provided
            if not source_lang:
                source_lang = await self.detect_language(text)

            # Skip translation if already in target language
            if source_lang == target_lang:
                self.stats['skipped_same_language'] += 1
                logger.info(f"Text already in target language ({target_lang})")
                duration = (datetime.now() - start_time).total_seconds()
                return text, duration, False

            # Get target language name
            target_lang_name = self.LANGUAGES.get(target_lang, (target_lang.upper(), ''))[0]

            # Create translation prompt
            prompt = f"""Translate the following text to {target_lang_name}.
Provide ONLY the translation without any explanations or additional text.

Text: {text}

Translation:"""

            # Call Gemini API
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        max_output_tokens=1000
                    )
                )
            )

            translation = response.text.strip()

            # Cache result
            if use_cache:
                self._cache_translation(cache_key, translation)

            duration = (datetime.now() - start_time).total_seconds()
            self.stats['successful_requests'] += 1
            self.stats['total_duration'] += duration

            logger.info(
                f"Translation successful: {len(text)} -> {len(translation)} chars in {duration:.2f}s"
            )

            return translation, duration, False

        except Exception as e:
            self.stats['failed_requests'] += 1
            logger.error(f"Translation failed: {e}")
            raise

    async def process_parallel(
        self,
        audio_transcription: str,
        target_lang: str,
        transcription_service: Optional[object] = None
    ) -> Tuple[str, Optional[str], float]:
        """
        Process transcription and language detection in parallel

        Args:
            audio_transcription: Transcribed text
            target_lang: Target language code
            transcription_service: Optional transcription service for future use

        Returns:
            Tuple of (translation, detected_language, total_time)
        """
        start_time = datetime.now()

        # Detect language
        detected_lang = await self.detect_language(audio_transcription)

        # Translate if needed
        if detected_lang != target_lang:
            translation, trans_time, was_cached = await self.translate_text(
                audio_transcription,
                target_lang,
                source_lang=detected_lang
            )
        else:
            translation = audio_transcription
            trans_time = 0.0

        total_time = (datetime.now() - start_time).total_seconds()

        return translation, detected_lang, total_time

    def clear_cache(self):
        """Clear translation cache"""
        self.cache.clear()
        logger.info("Translation cache cleared")

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

    @classmethod
    def get_languages(cls):
        """Get list of supported languages"""
        return [
            {
                "code": code,
                "name": info[0],
                "flag": info[1]
            }
            for code, info in cls.LANGUAGES.items()
        ]
