"""
Audio processing utilities with optimization features
"""
import io
import wave
import numpy as np
from typing import Optional, Tuple
from config.settings import settings


class AudioProcessor:
    """Advanced audio processing with preprocessing capabilities"""

    def __init__(
        self,
        sample_rate: int = None,
        bit_depth: int = None,
        enable_agc: bool = True,
        enable_noise_gate: bool = True
    ):
        self.sample_rate = sample_rate or settings.audio_sample_rate
        self.bit_depth = bit_depth or settings.audio_bit_depth
        self.enable_agc = enable_agc
        self.enable_noise_gate = enable_noise_gate

    def create_wav_from_pcm(
        self,
        pcm_data: bytes,
        channels: int = 1
    ) -> io.BytesIO:
        """
        Create WAV file in memory from PCM data

        Args:
            pcm_data: Raw PCM audio data
            channels: Number of audio channels (default: 1)

        Returns:
            BytesIO object containing WAV data
        """
        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(self.bit_depth // 8)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(pcm_data)

        wav_buffer.seek(0)
        return wav_buffer

    def preprocess_audio(self, pcm_data: bytes) -> bytes:
        """
        Preprocess audio with AGC and noise gate

        Args:
            pcm_data: Raw PCM audio data

        Returns:
            Processed PCM audio data
        """
        # Convert bytes to numpy array
        audio_array = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32)

        # Apply noise gate
        if self.enable_noise_gate:
            audio_array = self._apply_noise_gate(audio_array)

        # Apply automatic gain control
        if self.enable_agc:
            audio_array = self._apply_agc(audio_array)

        # Convert back to int16 bytes
        return audio_array.astype(np.int16).tobytes()

    def _apply_noise_gate(
        self,
        audio: np.ndarray,
        threshold_db: float = -40.0
    ) -> np.ndarray:
        """
        Apply noise gate to remove low-level noise

        Args:
            audio: Audio data as numpy array
            threshold_db: Threshold in dB below which audio is muted

        Returns:
            Processed audio array
        """
        # Convert threshold from dB to amplitude
        threshold = 10 ** (threshold_db / 20.0) * 32768

        # Create gate mask
        mask = np.abs(audio) > threshold

        # Apply gate with smooth transitions
        return audio * mask

    def _apply_agc(
        self,
        audio: np.ndarray,
        target_level: float = -20.0,
        max_gain_db: float = 30.0
    ) -> np.ndarray:
        """
        Apply automatic gain control

        Args:
            audio: Audio data as numpy array
            target_level: Target RMS level in dB
            max_gain_db: Maximum gain to apply in dB

        Returns:
            Processed audio array
        """
        if len(audio) == 0:
            return audio

        # Calculate current RMS level
        rms = np.sqrt(np.mean(audio ** 2))

        if rms < 1e-6:  # Avoid division by zero
            return audio

        # Calculate required gain
        current_db = 20 * np.log10(rms / 32768)
        gain_db = target_level - current_db

        # Limit gain
        gain_db = np.clip(gain_db, -max_gain_db, max_gain_db)
        gain_linear = 10 ** (gain_db / 20.0)

        # Apply gain
        processed = audio * gain_linear

        # Prevent clipping
        max_val = np.abs(processed).max()
        if max_val > 32767:
            processed = processed * (32767 / max_val)

        return processed

    def apply_high_pass_filter(
        self,
        audio: np.ndarray,
        cutoff_freq: float = 80.0
    ) -> np.ndarray:
        """
        Apply high-pass filter to remove low-frequency noise

        Args:
            audio: Audio data as numpy array
            cutoff_freq: Cutoff frequency in Hz

        Returns:
            Filtered audio array
        """
        # Simple first-order high-pass filter
        alpha = 1.0 / (1.0 + 2.0 * np.pi * cutoff_freq / self.sample_rate)

        filtered = np.zeros_like(audio)
        filtered[0] = audio[0]

        for i in range(1, len(audio)):
            filtered[i] = alpha * (filtered[i-1] + audio[i] - audio[i-1])

        return filtered

    def detect_voice_activity(
        self,
        pcm_data: bytes,
        threshold_db: float = -30.0
    ) -> Tuple[bool, float]:
        """
        Detect voice activity in audio chunk

        Args:
            pcm_data: Raw PCM audio data
            threshold_db: Threshold for voice detection

        Returns:
            Tuple of (has_voice, energy_level)
        """
        audio_array = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32)

        # Calculate RMS energy
        rms = np.sqrt(np.mean(audio_array ** 2))

        if rms < 1e-6:
            return False, 0.0

        energy_db = 20 * np.log10(rms / 32768)
        has_voice = energy_db > threshold_db

        return has_voice, energy_db

    def get_optimal_chunk_duration(
        self,
        pcm_data: bytes,
        min_duration: float = 1.0,
        max_duration: float = 4.0
    ) -> float:
        """
        Calculate optimal processing chunk duration based on voice activity

        Args:
            pcm_data: Raw PCM audio data
            min_duration: Minimum chunk duration
            max_duration: Maximum chunk duration

        Returns:
            Optimal duration in seconds
        """
        has_voice, energy = self.detect_voice_activity(pcm_data)

        if not has_voice:
            return min_duration

        # Higher energy = shorter chunks for more responsive processing
        if energy > -15.0:
            return min_duration
        elif energy > -25.0:
            return (min_duration + max_duration) / 2
        else:
            return max_duration


def create_wav_from_pcm(
    pcm_data: bytes,
    sample_rate: int = 16000,
    channels: int = 1,
    bit_depth: int = 16
) -> io.BytesIO:
    """
    Convenience function to create WAV from PCM data

    Args:
        pcm_data: Raw PCM audio data
        sample_rate: Sample rate in Hz
        channels: Number of audio channels
        bit_depth: Bit depth (8, 16, or 24)

    Returns:
        BytesIO object containing WAV data
    """
    processor = AudioProcessor(sample_rate=sample_rate, bit_depth=bit_depth)
    return processor.create_wav_from_pcm(pcm_data, channels=channels)
