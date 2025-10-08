"""
Streaming service for WebSocket-based real-time translation
with heartbeat and parallel processing
"""
import asyncio
import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

from fastapi import WebSocket, WebSocketDisconnect

from config.settings import settings
from services.transcription import TranscriptionService
from services.translation import TranslationService
from models.schemas import StreamMessage, TranslationResponse
from utils.audio import AudioProcessor

logger = logging.getLogger(__name__)


class StreamingService:
    """
    Manages WebSocket connections with heartbeat monitoring
    and real-time audio processing
    """

    def __init__(
        self,
        transcription_service: TranscriptionService,
        translation_service: TranslationService
    ):
        self.transcription_service = transcription_service
        self.translation_service = translation_service
        self.audio_processor = AudioProcessor()
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self.stats = {
            'total_connections': 0,
            'active_connections': 0,
            'total_messages': 0,
            'total_errors': 0
        }

    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None) -> str:
        """
        Accept and register WebSocket connection

        Args:
            websocket: WebSocket connection
            client_id: Optional client identifier

        Returns:
            Connection ID
        """
        await websocket.accept()

        if not client_id:
            client_id = str(uuid4())

        self.active_connections[client_id] = websocket
        self.connection_metadata[client_id] = {
            'connected_at': datetime.now(),
            'last_heartbeat': time.time(),
            'messages_received': 0,
            'messages_sent': 0,
            'target_language': settings.default_target_language
        }

        self.stats['total_connections'] += 1
        self.stats['active_connections'] += 1

        logger.info(f"Client {client_id} connected")

        return client_id

    async def disconnect(self, client_id: str):
        """
        Disconnect and cleanup client connection

        Args:
            client_id: Client identifier
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]

        if client_id in self.connection_metadata:
            del self.connection_metadata[client_id]

        self.stats['active_connections'] -= 1

        logger.info(f"Client {client_id} disconnected")

    async def send_message(
        self,
        client_id: str,
        message_type: str,
        data: Optional[Dict[str, Any]] = None
    ):
        """
        Send message to client

        Args:
            client_id: Client identifier
            message_type: Type of message
            data: Message payload
        """
        if client_id not in self.active_connections:
            return

        try:
            message = StreamMessage(type=message_type, data=data)
            await self.active_connections[client_id].send_json(message.dict())

            if client_id in self.connection_metadata:
                self.connection_metadata[client_id]['messages_sent'] += 1

        except Exception as e:
            logger.error(f"Failed to send message to {client_id}: {e}")
            await self.disconnect(client_id)

    async def heartbeat_monitor(self, client_id: str, websocket: WebSocket):
        """
        Monitor connection with periodic heartbeat

        Args:
            client_id: Client identifier
            websocket: WebSocket connection
        """
        try:
            while client_id in self.active_connections:
                await asyncio.sleep(settings.websocket_heartbeat_interval)

                # Send ping
                await self.send_message(client_id, "ping")

                # Check for stale connections
                if client_id in self.connection_metadata:
                    last_heartbeat = self.connection_metadata[client_id]['last_heartbeat']
                    if time.time() - last_heartbeat > settings.websocket_heartbeat_interval * 2:
                        logger.warning(f"Client {client_id} heartbeat timeout")
                        await self.disconnect(client_id)
                        break

        except asyncio.CancelledError:
            logger.info(f"Heartbeat monitor cancelled for {client_id}")
        except Exception as e:
            logger.error(f"Heartbeat monitor error for {client_id}: {e}")

    async def process_audio_chunk(
        self,
        client_id: str,
        audio_data: bytes,
        target_language: Optional[str] = None
    ) -> Optional[TranslationResponse]:
        """
        Process audio chunk with parallel transcription and translation

        Args:
            client_id: Client identifier
            audio_data: Raw PCM audio data
            target_language: Target language code

        Returns:
            TranslationResponse or None if processing fails
        """
        start_time = datetime.now()

        try:
            # Get target language
            if not target_language and client_id in self.connection_metadata:
                target_language = self.connection_metadata[client_id]['target_language']
            elif not target_language:
                target_language = settings.default_target_language

            # Check voice activity
            has_voice, energy_level = self.audio_processor.detect_voice_activity(audio_data)

            if not has_voice:
                logger.debug(f"No voice activity detected (energy: {energy_level:.2f} dB)")
                return None

            # Transcribe audio
            transcription, trans_time = await self.transcription_service.transcribe_audio(
                audio_data
            )

            if not transcription or not transcription.strip():
                logger.debug("Empty transcription received")
                return None

            # Translate with parallel language detection
            translation, detected_lang, trans_time = await self.translation_service.process_parallel(
                transcription,
                target_language
            )

            # Calculate metrics
            total_time = (datetime.now() - start_time).total_seconds()
            word_count = len(transcription.split())
            processing_speed = word_count / total_time if total_time > 0 else 0

            # Create response
            response = TranslationResponse(
                transcription=transcription,
                translation=translation,
                source_language=detected_lang,
                target_language=target_language,
                latency=total_time,
                processing_speed=processing_speed,
                timestamp=datetime.now().isoformat()
            )

            logger.info(
                f"Processed audio for {client_id}: "
                f"{word_count} words in {total_time:.2f}s "
                f"({processing_speed:.1f} words/s)"
            )

            return response

        except Exception as e:
            self.stats['total_errors'] += 1
            logger.error(f"Audio processing error for {client_id}: {e}")
            await self.send_message(
                client_id,
                "error",
                {"error": str(e), "timestamp": datetime.now().isoformat()}
            )
            return None

    async def handle_client_message(
        self,
        client_id: str,
        message: Dict[str, Any]
    ):
        """
        Handle incoming client message

        Args:
            client_id: Client identifier
            message: Message data
        """
        try:
            message_type = message.get('type')

            if message_type == 'pong':
                # Update heartbeat timestamp
                if client_id in self.connection_metadata:
                    self.connection_metadata[client_id]['last_heartbeat'] = time.time()

            elif message_type == 'config':
                # Update client configuration
                if client_id in self.connection_metadata:
                    data = message.get('data', {})
                    if 'target_language' in data:
                        self.connection_metadata[client_id]['target_language'] = data['target_language']
                        logger.info(f"Updated target language for {client_id}: {data['target_language']}")

            elif message_type == 'audio':
                # Process audio data
                data = message.get('data', {})
                audio_base64 = data.get('audio')

                if audio_base64:
                    import base64
                    audio_data = base64.b64decode(audio_base64)

                    target_lang = data.get('target_language')
                    response = await self.process_audio_chunk(
                        client_id,
                        audio_data,
                        target_lang
                    )

                    if response:
                        await self.send_message(
                            client_id,
                            "translation",
                            response.dict()
                        )

            if client_id in self.connection_metadata:
                self.connection_metadata[client_id]['messages_received'] += 1

            self.stats['total_messages'] += 1

        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {e}")
            self.stats['total_errors'] += 1

    async def handle_connection(
        self,
        websocket: WebSocket,
        client_id: Optional[str] = None
    ):
        """
        Main connection handler with heartbeat and message processing

        Args:
            websocket: WebSocket connection
            client_id: Optional client identifier
        """
        client_id = await self.connect(websocket, client_id)

        # Start heartbeat monitor
        heartbeat_task = asyncio.create_task(
            self.heartbeat_monitor(client_id, websocket)
        )

        try:
            # Send initial status
            await self.send_message(
                client_id,
                "status",
                {
                    "connected": True,
                    "client_id": client_id,
                    "timestamp": datetime.now().isoformat()
                }
            )

            # Message handling loop
            while True:
                data = await websocket.receive_json()
                await self.handle_client_message(client_id, data)

        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected normally")

        except Exception as e:
            logger.error(f"Connection error for {client_id}: {e}")
            self.stats['total_errors'] += 1

        finally:
            heartbeat_task.cancel()
            await self.disconnect(client_id)

    def get_stats(self) -> dict:
        """Get streaming service statistics"""
        return {
            **self.stats,
            'active_connection_ids': list(self.active_connections.keys())
        }

    def get_connection_info(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Get information about specific connection"""
        if client_id in self.connection_metadata:
            metadata = self.connection_metadata[client_id].copy()
            metadata['connected_at'] = metadata['connected_at'].isoformat()
            return metadata
        return None
