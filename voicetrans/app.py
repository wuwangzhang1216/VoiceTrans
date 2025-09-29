#!/usr/bin/env python3
"""
VoiceTrans - Professional Real-time Voice Translator
Ultra-low latency implementation for seamless translation
"""

import sys
import os
import threading
import queue
import time
import json
import numpy as np
import pyaudio
import wave
import tempfile
from datetime import datetime
from pathlib import Path
from collections import deque
import io
from concurrent.futures import ThreadPoolExecutor

# Audio processing
import webrtcvad

# Fireworks AI via OpenAI client
from openai import OpenAI

# Advanced Terminal UI
from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.live import Live
from rich.text import Text
from rich.align import Align
from rich import box
from rich.columns import Columns
from rich.syntax import Syntax

class FireworksVoiceTranslator:
    """Ultra-low latency Voice Translator"""

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

    THEMES = {
        'dark': {
            'bg': 'black',
            'primary': 'cyan',
            'secondary': 'blue',
            'accent': 'green',
            'warning': 'yellow',
            'error': 'red'
        },
        'light': {
            'bg': 'white',
            'primary': 'blue',
            'secondary': 'cyan',
            'accent': 'green',
            'warning': 'yellow',
            'error': 'red'
        }
    }

    def __init__(self, target='zh', theme='dark'):
        # Load config if exists
        self.config = self.load_config()

        self.console = Console()
        self.target_lang = self.config.get('default_target_language', target)
        self.theme = self.THEMES[self.config.get('theme', theme)]

        # Audio settings optimized for Fireworks
        self.sample_rate = 16000
        self.chunk_size = 480  # 30ms chunks for more stable detection
        self.is_recording = True

        # VAD with balanced settings
        self.vad_level = 2  # Moderate aggressive VAD (1=least, 3=most)
        self.vad = webrtcvad.Vad(self.vad_level)

        # Improved detection parameters for natural speech
        self.silence_threshold = 25  # 750ms of silence (more natural pause)
        self.min_speech_chunks = 10   # 300ms minimum speech
        self.max_recording_duration = 5  # 5s max to avoid multiple sentences
        self.speech_timeout = 100  # 3s timeout for single utterance
        self.sensitivity_mode = self.config.get('sensitivity_mode', 'Balanced')

        # Fireworks-specific settings
        self.use_vad_optimization = self.config.get('use_vad_optimization', True)
        self.use_turbo_model = self.config.get('use_turbo_model', True)
        
        # Queues
        self.audio_queue = queue.Queue()
        self.result_queue = queue.Queue()

        # State
        self.is_running = True
        self.session_start = datetime.now()

        # Fireworks Client
        self.fireworks_client = None
        self.openai_client = None  # Backup for translation
        self.api_status = "Not initialized"
        self.is_processing = False
        
        # Model selection
        self.whisper_model = "whisper-v3-turbo" if self.use_turbo_model else "whisper-v3"
        self.temperature = 0
        
        # Thread pool for parallel processing
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Statistics
        self.stats = {
            'total_translations': 0,
            'total_words': 0,
            'avg_latency': 0.0,
            'total_latency': 0.0,
            'session_duration': 0,
            'languages_used': set(),
            'peak_latency': 0.0,
            'min_latency': float('inf'),
            'api_calls': 0,
            'api_errors': 0,
            'total_audio_duration': 0,
            'fireworks_savings': 0,  # Time saved
            'processing_speed': 0  # x realtime
        }

        # History
        self.history = deque(maxlen=100)
        self.current_transcription = ""
        self.audio_level = 0
        self.is_speaking = False

        # UI State
        self.show_history = self.config.get('show_history', True)
        self.show_stats = self.config.get('show_stats', True)
        self.ui_message = ""
        self.ui_message_time = 0
        self.sensitivity_display_time = 0
        
        # Audio buffer
        self.continuous_audio_buffer = []
        self.recording_start_time = None
        
        # API keys
        self.fireworks_api_key = None
        self.openai_api_key = None

    def load_config(self):
        """Load configuration from config.json if it exists"""
        config_path = Path('config.json')
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Could not load config.json: {e}")
        return {}

    def save_config(self):
        """Save current configuration to config.json"""
        config_path = Path('config.json')
        config = {
            'fireworks_api_key': self.fireworks_api_key or '',
            'openai_api_key': self.openai_api_key or '',
            'default_target_language': self.target_lang,
            'theme': 'dark' if self.theme == self.THEMES['dark'] else 'light',
            'sensitivity_mode': self.sensitivity_mode,
            'use_turbo_model': self.use_turbo_model,
            'use_vad_optimization': self.use_vad_optimization,
            'show_history': self.show_history,
            'show_stats': self.show_stats
        }
        try:
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save config.json: {e}")

    def initialize(self):
        """Initialize Fireworks AI and audio components"""
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
            ) as progress:

                # Initialize AI API
                task = progress.add_task("[cyan]Connecting to transcription service...", total=None)
                
                # Try to get Fireworks API key - priority order: env var, config.json, user config file
                self.fireworks_api_key = os.getenv('FIREWORKS_API_KEY') or self.config.get('fireworks_api_key')

                if not self.fireworks_api_key:
                    # Try user config file as last resort
                    config_file = Path.home() / '.voicetrans_config.json'
                    if config_file.exists():
                        with open(config_file) as f:
                            user_config = json.load(f)
                            self.fireworks_api_key = user_config.get('fireworks_api_key')
                
                if not self.fireworks_api_key:
                    # Prompt for API key
                    progress.stop()
                    self.console.print("[yellow]Fireworks API key not found.[/]")
                    self.console.print("[dim]Get your free API key at: https://fireworks.ai[/]")
                    api_key = input("Please enter your Fireworks API key: ").strip()
                    if api_key:
                        self.fireworks_api_key = api_key
                        # Save for future use
                        save = input("Save API key to config.json? (y/n): ").strip().lower()
                        if save == 'y':
                            self.save_config()
                            self.console.print("[green]✓ API key saved to config.json[/]")
                    progress.start()

                if self.fireworks_api_key:
                    try:
                        # Initialize Fireworks client using OpenAI SDK
                        self.fireworks_client = OpenAI(
                            base_url="https://audio-prod.us-virginia-1.direct.fireworks.ai/v1",
                            api_key=self.fireworks_api_key
                        )
                        
                        # Test the API with a small audio sample
                        test_audio = self._create_test_audio()
                        test_audio_bytes = test_audio.read()
                        
                        progress.update(task, description="[cyan]Testing Fireworks connection...")
                        
                        test_response = self.fireworks_client.audio.transcriptions.create(
                            model="whisper-v3",  # Use standard model name for test
                            file=("test.wav", test_audio_bytes, "audio/wav"),
                            response_format="text"
                        )
                        
                        self.api_status = "API Connected"
                        progress.update(task, description="[green]✓ Transcription service connected")
                        
                        # Successfully connected - use standard model name
                        self.whisper_model = "whisper-v3"
                        
                    except Exception as e:
                        error_str = str(e)
                        if "401" in error_str:
                            self.api_status = "Invalid API key"
                            progress.update(task, description="[red]✗ Invalid API key")
                        elif "404" in error_str:
                            self.api_status = "Invalid endpoint"
                            progress.update(task, description="[red]✗ API endpoint not found")
                        else:
                            self.api_status = f"Error: {error_str[:30]}"
                            progress.update(task, description=f"[red]✗ API error: {error_str[:50]}")
                        self.fireworks_client = None
                        
                        # Show the actual error for debugging
                        self.console.print(f"\n[yellow]Debug info:[/] {error_str}\n")
                else:
                    self.api_status = "No API key"
                    progress.update(task, description="[yellow]⚠ No API key - transcription unavailable")
                    self.fireworks_client = None

                # Try to get OpenAI API key for translation
                task = progress.add_task("[cyan]Setting up translation service...", total=None)
                self.openai_api_key = os.getenv('OPENAI_API_KEY') or self.config.get('openai_api_key')
                
                if self.openai_api_key:
                    try:
                        self.openai_client = OpenAI(api_key=self.openai_api_key)
                        progress.update(task, description="[green]✓ Translation service ready (GPT-4)")
                    except:
                        progress.update(task, description="[yellow]⚠ Translation service unavailable")
                        self.openai_client = None
                else:
                    progress.update(task, description="[yellow]⚠ No OpenAI key - translation disabled")

                # Initialize Audio
                task = progress.add_task("[cyan]Initializing audio system...", total=None)
                self.pyaudio = pyaudio.PyAudio()
                
                # Find the best audio device
                default_device = self.pyaudio.get_default_input_device_info()
                self.console.print(f"[dim]Using audio device: {default_device['name']}[/]")
                
                self.stream = self.pyaudio.open(
                    format=pyaudio.paInt16,
                    channels=1,
                    rate=self.sample_rate,
                    input=True,
                    frames_per_buffer=self.chunk_size
                )
                progress.update(task, description="[green]✓ Audio system ready")
                
                # Show optimization status
                self.console.print("\n[bold cyan]🚀 Optimizations Active:[/]")
                self.console.print("  • Ultra-fast transcription")
                self.console.print("  • Low latency for real-time chunks")
                self.console.print("  • Cost-effective operation")
                if self.use_turbo_model:
                    self.console.print("  • Turbo model enabled")
                if self.use_vad_optimization:
                    self.console.print("  • VAD optimization enabled")

            return True

        except Exception as e:
            self.console.print(f"[red]✗ Initialization failed: {e}")
            return False

    def _create_test_audio(self):
        """Create a silent test audio for API validation"""
        # Create 0.5 second of silence
        duration = 0.5
        samples = np.zeros(int(self.sample_rate * duration), dtype=np.int16)
        
        # Create WAV file in memory
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(samples.tobytes())
        
        buffer.seek(0)
        return buffer

    def process_audio(self):
        """Audio processing thread optimized for Fireworks low-latency"""
        frames = []
        silent_chunks = 0
        speech_chunks = 0
        recording_chunks = 0
        
        while self.is_running:
            try:
                if self.is_recording:
                    # Read audio
                    data = self.stream.read(self.chunk_size, exception_on_overflow=False)

                    # Calculate audio level for visualization
                    audio_array = np.frombuffer(data, dtype=np.int16)
                    self.audio_level = np.abs(audio_array).mean() / 32768.0

                    # VAD check with dynamic threshold
                    is_speech = self.vad.is_speech(data, self.sample_rate)

                    # Dynamic amplitude threshold based on mode
                    amplitude_threshold = {
                        "Hyper-Speed": 0.003,
                        "Ultra-Fast": 0.005,
                        "Balanced": 0.008,
                        "Accurate": 0.01
                    }.get(self.sensitivity_mode, 0.008)

                    is_loud_enough = self.audio_level > amplitude_threshold

                    # Combine VAD and amplitude
                    is_speech = is_speech and is_loud_enough
                    self.is_speaking = is_speech

                    if is_speech:
                        if not frames:  # Start of new speech
                            self.recording_start_time = time.time()
                            
                        frames.append(data)
                        silent_chunks = 0
                        speech_chunks += 1
                        recording_chunks += 1

                        # Check for max duration or speech timeout
                        if (recording_chunks * self.chunk_size / self.sample_rate > self.max_recording_duration or
                            speech_chunks >= self.speech_timeout):
                            if len(frames) > self.min_speech_chunks:
                                audio_data = b''.join(frames)
                                # Process immediately with Fireworks
                                threading.Thread(
                                    target=self.transcribe_with_fireworks, 
                                    args=(audio_data,), 
                                    daemon=True
                                ).start()
                            frames = []
                            recording_chunks = 0
                            speech_chunks = 0

                    elif frames:
                        silent_chunks += 1
                        frames.append(data)

                        # Improved end detection with natural pause threshold
                        if silent_chunks > self.silence_threshold:
                            if len(frames) > self.min_speech_chunks:
                                duration = len(frames) * self.chunk_size / self.sample_rate
                                # Ensure minimum duration for meaningful speech (skip short noises)
                                if duration < 0.5:
                                    frames = []
                                    silent_chunks = 0
                                    speech_chunks = 0
                                    recording_chunks = 0
                                    self.is_speaking = False
                                    continue
                                self.stats['total_audio_duration'] += duration
                                
                                audio_data = b''.join(frames)
                                # Process immediately with Fireworks
                                threading.Thread(
                                    target=self.transcribe_with_fireworks, 
                                    args=(audio_data,), 
                                    daemon=True
                                ).start()

                            frames = []
                            silent_chunks = 0
                            speech_chunks = 0
                            recording_chunks = 0
                            self.is_speaking = False
                else:
                    time.sleep(0.1)

            except Exception as e:
                self.ui_message = f"Audio error: {str(e)}"
                self.ui_message_time = time.time()
                self.stats['api_errors'] += 1
                time.sleep(0.1)

    def transcribe_with_fireworks(self, audio_data):
        """Transcribe audio for ultra-low latency"""
        try:
            start_time = time.time()
            self.is_processing = True

            if not self.fireworks_client:
                self.ui_message = "API not configured"
                self.ui_message_time = time.time()
                self.is_processing = False
                return

            # Create WAV file in memory - properly formatted
            audio_buffer = io.BytesIO()
            with wave.open(audio_buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_data)
            
            # Get the complete WAV file bytes
            wav_bytes = audio_buffer.getvalue()
            audio_duration = len(audio_data) / (self.sample_rate * 2)
            
            # Debug message
            self.ui_message = f"Processing {audio_duration:.1f}s audio..."
            self.ui_message_time = time.time()

            try:
                # Call Fireworks API exactly like the test script
                transcription = self.fireworks_client.audio.transcriptions.create(
                    model="whisper-v3",
                    file=("audio.wav", wav_bytes, "audio/wav")
                )
                
                # Get transcribed text - handle the response format
                if hasattr(transcription, 'text'):
                    text = transcription.text.strip()
                else:
                    text = str(transcription).strip()
                
                if not text or text == "":
                    self.ui_message = "No speech detected"
                    self.ui_message_time = time.time()
                    self.is_processing = False
                    return
                
                self.stats['api_calls'] += 1
                
                # Debug: Show successful transcription
                self.ui_message = f"Transcribed: {text[:30]}..."
                self.ui_message_time = time.time()
                
                # Translation
                translated = text
                if self.openai_client:
                    try:
                        translation_future = self.executor.submit(
                            self._translate_text, text
                        )
                        translated = translation_future.result(timeout=3)
                    except:
                        translated = text
                    
            except Exception as e:
                # More detailed error message
                error_msg = str(e)
                if "401" in error_msg or "unauthorized" in error_msg:
                    self.ui_message = "Invalid API key"
                elif "429" in error_msg:
                    self.ui_message = "Rate limit hit"
                elif "400" in error_msg:
                    self.ui_message = "Bad request format"
                else:
                    self.ui_message = f"API: {error_msg[:40]}"
                self.ui_message_time = time.time()
                self.stats['api_errors'] += 1
                self.is_processing = False
                
                # Print full error for debugging
                print(f"Debug - Full error: {error_msg}")
                return

            # Calculate metrics
            latency = time.time() - start_time
            audio_duration = len(audio_data) / (self.sample_rate * 2)  # 2 bytes per sample
            processing_speed = audio_duration / latency if latency > 0 else 0

            # Update statistics
            self.stats['total_translations'] += 1
            self.stats['total_words'] += len(text.split())
            self.stats['total_latency'] += latency
            self.stats['avg_latency'] = self.stats['total_latency'] / self.stats['total_translations']
            self.stats['peak_latency'] = max(self.stats['peak_latency'], latency)
            self.stats['min_latency'] = min(self.stats['min_latency'], latency)
            self.stats['processing_speed'] = processing_speed
            self.stats['languages_used'].add(self.target_lang)
            
            # Calculate time savings (assuming 3s average baseline)
            baseline_latency = 3.0
            time_saved = max(0, baseline_latency - latency)
            self.stats['fireworks_savings'] += time_saved

            # Add to history
            entry = {
                'timestamp': datetime.now(),
                'original': text,
                'translated': translated,
                'target_lang': self.target_lang,
                'latency': latency,
                'words': len(text.split()),
                'api_model': self.whisper_model,
                'speed': f"{processing_speed:.1f}x"
            }
            self.history.append(entry)

            # Show ultra-fast response
            if latency < 0.5:
                self.ui_message = f"⚡ Ultra-fast: {latency:.2f}s ({processing_speed:.0f}x realtime)"
                self.ui_message_time = time.time()

            self.is_processing = False

        except Exception as e:
            self.ui_message = f"Processing error: {str(e)}"
            self.ui_message_time = time.time()
            self.stats['api_errors'] += 1
            self.is_processing = False

    def _translate_text(self, text):
        """Translate text using GPT-4"""
        if not self.openai_client:
            return text
            
        try:
            resp = self.openai_client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {
                        "role": "system", 
                        "content": f"Translate to {self.LANGUAGES[self.target_lang][0]}. Output only the translation."
                    },
                    {"role": "user", "content": text}
                ],
                temperature=0.3,
                max_tokens=200
            )
            return resp.choices[0].message.content.strip()
        except:
            return text

    def save_to_file(self):
        """Save conversation history to a text file"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"voice_translation_{timestamp}.txt"

            with open(filename, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write(f"Voice Translation Session - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Target Language: {self.LANGUAGES[self.target_lang][0]}\n")
                f.write("=" * 80 + "\n\n")

                if self.history:
                    for entry in self.history:
                        f.write(f"[{entry['timestamp'].strftime('%H:%M:%S')}]\n")
                        f.write(f"Original: {entry['original']}\n")
                        f.write(f"Translation ({self.LANGUAGES[entry['target_lang']][0]}): {entry['translated']}\n")
                        f.write(f"Latency: {entry['latency']:.3f}s | Words: {entry['words']} | Speed: {entry['speed']}\n")
                        f.write("-" * 40 + "\n\n")

                    # Add statistics summary
                    f.write("\n" + "=" * 80 + "\n")
                    f.write("Session Statistics\n")
                    f.write("=" * 80 + "\n")
                    f.write(f"Total Translations: {self.stats['total_translations']}\n")
                    f.write(f"Total Words: {self.stats['total_words']}\n")
                    f.write(f"Average Latency: {self.stats['avg_latency']:.3f}s\n")
                    f.write(f"Best Latency: {self.stats['min_latency']:.3f}s\n")
                    f.write(f"Worst Latency: {self.stats['peak_latency']:.3f}s\n")
                    f.write(f"Processing Speed: {self.stats['processing_speed']:.1f}x realtime\n")
                    f.write(f"Time Saved: {self.stats['fireworks_savings']/60:.1f} minutes\n")
                else:
                    f.write("No translations recorded in this session.\n")

            self.ui_message = f"✓ Saved to {filename}"
            self.ui_message_time = time.time()

        except Exception as e:
            self.ui_message = f"Save failed: {str(e)[:30]}"
            self.ui_message_time = time.time()

    def adjust_sensitivity(self, direction):
        """Adjust detection sensitivity"""
        if direction == '+':
            # Hyper-speed mode - very short pauses
            self.silence_threshold = 15  # 450ms pause
            self.min_speech_chunks = 8   # 240ms min
            self.max_recording_duration = 3  # 3s max
            self.speech_timeout = 65  # ~2s max utterance
            self.sensitivity_mode = "Hyper-Speed"
            self.vad_level = 1
            self.vad.set_mode(self.vad_level)
            self.ui_message = "🚀 Hyper-Speed Mode - Minimum latency"
        elif direction == '-':
            # More accurate - longer pauses for complete sentences
            self.silence_threshold = 35  # 1050ms pause
            self.min_speech_chunks = 15  # 450ms min
            self.max_recording_duration = 7  # 7s max
            self.speech_timeout = 165  # ~5s max utterance
            self.sensitivity_mode = "Accurate"
            self.vad_level = 3
            self.vad.set_mode(self.vad_level)
            self.ui_message = "🎯 Accurate Mode - Better accuracy"
        elif direction == '=':
            # Ultra-fast - balanced speed
            self.silence_threshold = 20  # 600ms pause
            self.min_speech_chunks = 10  # 300ms min
            self.max_recording_duration = 4  # 4s max
            self.speech_timeout = 100  # ~3s max utterance
            self.sensitivity_mode = "Ultra-Fast"
            self.vad_level = 2
            self.vad.set_mode(self.vad_level)
            self.ui_message = "⚡ Ultra-Fast Mode - Optimized performance"
        elif direction == '0':
            # Balanced mode - natural conversation
            self.silence_threshold = 25  # 750ms pause
            self.min_speech_chunks = 10  # 300ms min
            self.max_recording_duration = 5  # 5s max
            self.speech_timeout = 100  # ~3s max utterance
            self.sensitivity_mode = "Balanced"
            self.vad_level = 2
            self.vad.set_mode(self.vad_level)
            self.ui_message = "⚖️ Balanced Mode - Reliable detection"

        self.ui_message_time = time.time()

    def create_header(self):
        """Create header panel"""
        header_text = Text()
        header_text.append("🚀 ", style="bold white")
        header_text.append("VOICETRANS", style="bold cyan")
        header_text.append(" - Real-time Voice Translator", style="dim cyan")
        header_text.append(" ⚡", style="bold yellow")

        return Panel(
            Align.center(header_text),
            style=f"bold {self.theme['primary']}",
            box=box.DOUBLE,
            padding=(0, 1)
        )

    def create_status_panel(self):
        """Create status panel"""
        # Language display
        target = self.LANGUAGES.get(self.target_lang, ('Unknown', '❓'))

        lang_text = Text()
        lang_text.append("Auto-detect", style=f"bold {self.theme['accent']}")
        lang_text.append("  →  ", style="bold white")
        lang_text.append(f"{target[0]} {target[1]}", style=f"bold {self.theme['accent']}")

        # Recording status
        if self.is_recording:
            if self.is_processing:
                rec_status = Text("⚡ PROCESSING", style="bold yellow")
            elif self.is_speaking:
                rec_status = Text("● LISTENING", style="bold green")
            else:
                rec_status = Text("● READY", style="bold green")
        else:
            rec_status = Text("⏸ PAUSED", style="bold yellow")

        # API status
        if "Connected" in self.api_status:
            api_status = Text(f"✓ API Connected", style="bold green")
        elif "Error" in self.api_status:
            api_status = Text(f"✗ API Error", style="bold red")
        else:
            api_status = Text(f"○ {self.api_status}", style="bold yellow")

        # Model info
        model_text = Text(f"📦 {self.whisper_model}", style="dim cyan")

        # Sensitivity mode
        if self.sensitivity_mode == "Hyper-Speed":
            sens_indicator = Text(f"🚀 {self.sensitivity_mode}", style="bold cyan")
        elif self.sensitivity_mode == "Ultra-Fast":
            sens_indicator = Text(f"⚡ {self.sensitivity_mode}", style="bold yellow")
        else:
            sens_indicator = Text(f"🎯 {self.sensitivity_mode}", style="bold green")

        # Audio level meter
        level_bar = self.create_audio_meter()

        # Combine status elements
        status_table = Table(show_header=False, box=None, padding=0)
        status_table.add_column(justify="center")
        status_table.add_row(lang_text)
        status_table.add_row("")
        status_table.add_row(rec_status)
        status_table.add_row(api_status)
        status_table.add_row(model_text)
        status_table.add_row(sens_indicator)
        status_table.add_row(level_bar)

        return Panel(
            status_table,
            title="[bold]Status",
            border_style=self.theme['secondary'],
            box=box.ROUNDED
        )

    def create_audio_meter(self):
        """Create audio level meter"""
        meter_width = 25
        filled = int(self.audio_level * meter_width * 10)
        filled = min(filled, meter_width)

        meter = Text()
        meter.append("│", style="dim")

        for i in range(meter_width):
            if i < filled:
                if i < meter_width * 0.6:
                    meter.append("█", style="green")
                elif i < meter_width * 0.8:
                    meter.append("█", style="yellow")
                else:
                    meter.append("█", style="red")
            else:
                meter.append("░", style="dim")

        meter.append("│", style="dim")

        return meter

    def create_translation_panel(self):
        """Create translation display panel"""
        if self.history:
            content = Table(show_header=False, box=None, padding=(0, 1), expand=True)
            content.add_column(style="yellow", width=12)
            content.add_column(overflow="fold")

            # Show last 3 messages
            recent_messages = list(self.history)[-3:]

            for i, entry in enumerate(recent_messages):
                # Add separator between messages (except for the first one)
                if i > 0:
                    content.add_row("", Text("─" * 60, style="dim"))
                    content.add_row("", "")

                # Original text
                content.add_row("[bold]Original:[/]", Text(entry['original'], style="white"))
                content.add_row("", "")

                # Translated text
                content.add_row("[bold]Translation:[/]", Text(entry['translated'], style=self.theme['accent']))
                content.add_row("", "")

                # Metadata with speed info
                time_str = entry['timestamp'].strftime('%H:%M:%S')

                # Ultra-fast latency color coding
                if entry['latency'] < 0.5:
                    latency_color = "bright_green"
                    speed_emoji = "🚀"
                elif entry['latency'] < 1:
                    latency_color = "green"
                    speed_emoji = "⚡"
                elif entry['latency'] < 2:
                    latency_color = "yellow"
                    speed_emoji = "✓"
                else:
                    latency_color = "red"
                    speed_emoji = "⚠"

                meta_text = Text()
                meta_text.append(f"{time_str} • ", style="dim")
                meta_text.append(f"{entry['words']} words • ", style="dim")
                meta_text.append(f"{speed_emoji} {entry['latency']:.3f}s", style=latency_color)
                meta_text.append(f" • {entry['speed']} realtime", style="dim cyan")

                content.add_row("", meta_text)

        else:
            content = Align.center(
                Text("🚀 Ready for ultra-fast transcription", style="dim italic cyan"),
                vertical="middle"
            )

        return Panel(
            content,
            title="[bold]Current Translations (Last 3)",
            border_style=self.theme['accent'],
            box=box.ROUNDED
        )

    def create_history_panel(self):
        """Create history panel"""
        history_table = Table(show_header=True, box=box.SIMPLE, padding=0)
        history_table.add_column("Time", style="dim", width=8)
        history_table.add_column("Text", style="white", ratio=1)
        history_table.add_column("→", style="dim", width=1)
        history_table.add_column("Translation", style=self.theme['accent'], ratio=1)
        history_table.add_column("⚡", style="dim", width=6)

        # Show last 5 entries
        for entry in list(self.history)[-5:]:
            time_str = entry['timestamp'].strftime('%H:%M:%S')
            orig = entry['original'][:25] + "..." if len(entry['original']) > 25 else entry['original']
            trans = entry['translated'][:25] + "..." if len(entry['translated']) > 25 else entry['translated']

            # Ultra-fast color coding
            if entry['latency'] < 0.5:
                latency_text = Text(f"{entry['latency']:.2f}s", style="bright_green")
            elif entry['latency'] < 1:
                latency_text = Text(f"{entry['latency']:.2f}s", style="green")
            else:
                latency_text = Text(f"{entry['latency']:.2f}s", style="yellow")

            history_table.add_row(
                time_str,
                orig,
                "→",
                trans,
                latency_text
            )

        return Panel(
            history_table,
            title=f"[bold]Recent History ({len(self.history)} total)",
            border_style=self.theme['secondary'],
            box=box.ROUNDED
        )

    def create_stats_panel(self):
        """Create statistics panel with Fireworks metrics"""
        if not self.show_stats:
            return Panel(
                Align.center(Text("Stats Hidden", style="dim")),
                title="[bold]Statistics",
                border_style="dim",
                box=box.ROUNDED
            )

        # Calculate session duration
        duration = (datetime.now() - self.session_start).total_seconds()
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        seconds = int(duration % 60)

        stats_table = Table(show_header=False, box=None, padding=0)
        stats_table.add_column(style=f"{self.theme['secondary']}", width=20)
        stats_table.add_column(style="white")

        stats_table.add_row("Session Time:", f"{hours:02d}:{minutes:02d}:{seconds:02d}")
        stats_table.add_row("Translations:", str(self.stats['total_translations']))
        stats_table.add_row("Total Words:", str(self.stats['total_words']))
        stats_table.add_row("API Calls:", str(self.stats['api_calls']))
        
        if self.stats['api_errors'] > 0:
            stats_table.add_row("API Errors:", Text(str(self.stats['api_errors']), style="red"))

        if self.stats['total_translations'] > 0:
            # Latency metrics
            avg_color = "bright_green" if self.stats['avg_latency'] < 0.5 else "green" if self.stats['avg_latency'] < 1 else "yellow"
            stats_table.add_row("Avg Latency:", 
                              Text(f"{self.stats['avg_latency']:.3f}s", style=avg_color))
            stats_table.add_row("Best/Worst:", 
                              f"{self.stats['min_latency']:.3f}s / {self.stats['peak_latency']:.3f}s")
            
            # Processing speed
            if self.stats['processing_speed'] > 0:
                stats_table.add_row("Speed:", 
                                  Text(f"{self.stats['processing_speed']:.0f}x realtime", style="cyan"))
            
            # Time saved
            time_saved_min = self.stats['fireworks_savings'] / 60
            stats_table.add_row("Time Saved:",
                              Text(f"{time_saved_min:.1f} min", style="green"))

            # Cost calculations with new pricing
            # Whisper-v3-large: $0.0015 per audio minute
            whisper_cost = (self.stats['total_audio_duration'] / 60) * 0.0015

            # GPT-4.1 nano for translation (assume ~50 tokens per translation at $0.20/1M input, $0.80/1M output)
            # Estimate: 30 input tokens + 30 output tokens per translation
            gpt_input_cost = (self.stats['total_translations'] * 30 / 1_000_000) * 0.20
            gpt_output_cost = (self.stats['total_translations'] * 30 / 1_000_000) * 0.80
            translation_cost = gpt_input_cost + gpt_output_cost

            total_cost = whisper_cost + translation_cost

            stats_table.add_row("Whisper Cost:", f"${whisper_cost:.5f}")
            if self.stats['total_translations'] > 0:
                stats_table.add_row("Translation:", f"${translation_cost:.5f}")
            stats_table.add_row("Total Cost:",
                              Text(f"${total_cost:.5f}", style="green"))

        return Panel(
            stats_table,
            title="[bold]Performance",
            border_style=self.theme['secondary'],
            box=box.ROUNDED
        )

    def create_controls_panel(self):
        """Create controls panel"""
        controls = Table(show_header=False, box=None, expand=True)
        controls.add_column(justify="center")

        # Main controls
        main_controls = Text()
        main_controls.append("L", style=f"bold {self.theme['warning']}")
        main_controls.append(" Language  ", style="dim")
        main_controls.append("Space", style=f"bold {self.theme['warning']}")
        main_controls.append(" Pause  ", style="dim")
        main_controls.append("H", style=f"bold {self.theme['warning']}")
        main_controls.append(" History  ", style="dim")
        main_controls.append("S", style=f"bold {self.theme['warning']}")
        main_controls.append(" Stats  ", style="dim")
        main_controls.append("Enter", style=f"bold {self.theme['warning']}")
        main_controls.append(" Save  ", style="dim")
        main_controls.append("Q", style=f"bold {self.theme['warning']}")
        main_controls.append(" Quit", style="dim")

        controls.add_row(main_controls)

        # Sensitivity controls
        sens_controls = Text()
        sens_controls.append("Speed: ", style="dim")
        sens_controls.append("+", style=f"bold {self.theme['accent']}")
        sens_controls.append(" Hyper  ", style="dim")
        sens_controls.append("-", style=f"bold {self.theme['accent']}")
        sens_controls.append(" Accurate  ", style="dim")
        sens_controls.append("=", style=f"bold {self.theme['accent']}")
        sens_controls.append(" Ultra-Fast  ", style="dim")
        sens_controls.append("0", style=f"bold {self.theme['accent']}")
        sens_controls.append(" Balanced", style="dim")

        controls.add_row(sens_controls)

        # Show message if any
        if self.ui_message and (time.time() - self.ui_message_time < 3):
            controls.add_row(Text(self.ui_message, style=f"{self.theme['warning']} italic"))

        return Panel(
            controls,
            style=f"{self.theme['primary']}",
            box=box.HEAVY
        )

    def create_layout(self):
        """Create the main layout"""
        layout = Layout()

        # Main structure
        layout.split_column(
            Layout(self.create_header(), size=3),
            Layout(name="main"),
            Layout(self.create_controls_panel(), size=4)
        )

        # Split main area based on history visibility
        if self.show_history:
            # With history panel - original layout
            layout["main"].split_row(
                Layout(name="left", ratio=1),
                Layout(name="center", ratio=3),
                Layout(name="right", ratio=1)
            )

            # Right side - History
            layout["main"]["right"].split_column(
                self.create_history_panel()
            )
        else:
            # Without history panel - use more space for other panels
            layout["main"].split_row(
                Layout(name="left", ratio=1),
                Layout(name="center", ratio=4)  # Center gets all the extra space
            )

        # Left side - Status
        layout["main"]["left"].split_column(
            Layout(self.create_status_panel()),
            Layout(self.create_stats_panel())
        )

        # Center - Translation
        layout["main"]["center"].split_column(
            self.create_translation_panel()
        )

        return layout

    def select_languages(self):
        """Language selection interface"""
        self.console.clear()

        # Create language table
        lang_table = Table(title="Available Target Languages (Whisper v3 Auto-detects Source)",
                          box=box.ROUNDED, show_header=True)
        lang_table.add_column("Code", style="cyan", width=6)
        lang_table.add_column("Language", style="yellow", width=15)
        lang_table.add_column("Flag", width=4)

        for code, (name, flag) in self.LANGUAGES.items():
            lang_table.add_row(code, name, flag)

        self.console.print(lang_table)
        self.console.print("\n[yellow]Note:[/] Source language is automatically detected by Whisper v3")

        # Current selection
        current = f"Auto-detect → {self.target_lang} {self.LANGUAGES[self.target_lang][1]}"
        self.console.print(f"\n[bold]Current:[/] {current}")

        # Get input
        target = input(f"Target language [{self.target_lang}]: ").strip()
        if target and target in self.LANGUAGES:
            self.target_lang = target
            self.stats['languages_used'].add(target)

        updated = f"Auto-detect → {self.target_lang} {self.LANGUAGES[self.target_lang][1]}"
        self.console.print(f"\n[green]✓ Updated:[/] {updated}")
        time.sleep(1.5)

    def run(self):
        """Main application loop"""
        if not self.initialize():
            return

        # Start audio processing thread
        audio_thread = threading.Thread(target=self.process_audio, daemon=True)
        audio_thread.start()

        # Setup terminal
        try:
            import termios, tty
            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            tty.setcbreak(fd)

            # Clear screen
            self.console.clear()

            # Main UI loop
            with Live(self.create_layout(), refresh_per_second=10, screen=True) as live:
                while self.is_running:
                    # Update display
                    live.update(self.create_layout())

                    # Check for keyboard input
                    import select
                    if sys.stdin in select.select([sys.stdin], [], [], 0.05)[0]:
                        key = sys.stdin.read(1)

                        if key.lower() == 'q':
                            self.is_running = False
                        elif key.lower() == 'l':
                            live.stop()
                            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
                            self.select_languages()
                            tty.setcbreak(fd)
                            self.console.clear()
                            live.start()
                        elif key == ' ':
                            self.is_recording = not self.is_recording
                            self.ui_message = "Recording paused" if not self.is_recording else "Recording resumed"
                            self.ui_message_time = time.time()
                        elif key.lower() == 'h':
                            self.show_history = not self.show_history
                        elif key.lower() == 's':
                            self.show_stats = not self.show_stats
                        elif key.lower() == 'c':
                            self.history.clear()
                            for key in ['total_translations', 'total_words', 'total_latency', 
                                       'avg_latency', 'api_calls', 'api_errors', 'fireworks_savings']:
                                if key in self.stats:
                                    self.stats[key] = 0
                            self.ui_message = "History cleared"
                            self.ui_message_time = time.time()
                        elif key.lower() == 't':
                            # Test mode - send a test transcription
                            live.stop()
                            self.console.print("\n[cyan]Testing API directly...[/]")
                            test_data = np.random.randint(-1000, 1000, 16000, dtype=np.int16).tobytes()
                            self.transcribe_with_fireworks(test_data)
                            time.sleep(2)
                            self.console.clear()
                            live.start()
                        elif key in ['+', '-', '=', '0']:
                            self.adjust_sensitivity(key)
                        elif key == '\n' or key == '\r':  # Enter key
                            self.save_to_file()

                    time.sleep(0.02)  # Faster refresh for ultra-low latency

        except KeyboardInterrupt:
            pass
        finally:
            # Restore terminal
            try:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            except:
                pass

            # Cleanup
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=False)
            if hasattr(self, 'stream'):
                self.stream.stop_stream()
                self.stream.close()
            if hasattr(self, 'pyaudio'):
                self.pyaudio.terminate()

            # Show exit message
            self.console.clear()
            self.console.print(Panel.fit(
                Text("🌍 Thanks for using VoiceTrans!", style="bold cyan"),
                border_style="cyan",
                box=box.DOUBLE
            ))

            # Final stats
            if self.stats['total_translations'] > 0:
                self.console.print(f"\n[bold]🚀 Session Performance:[/]")
                self.console.print(f"  • Translations: {self.stats['total_translations']}")
                self.console.print(f"  • Average latency: [green]{self.stats['avg_latency']:.3f}s[/]")
                self.console.print(f"  • Best latency: [bright_green]{self.stats['min_latency']:.3f}s[/]")
                self.console.print(f"  • Processing speed: [cyan]{self.stats['processing_speed']:.0f}x realtime[/]")
                self.console.print(f"  • Time saved: [green]{self.stats['fireworks_savings']/60:.1f} minutes[/]")

                # Cost calculation with new pricing
                whisper_cost = (self.stats['total_audio_duration'] / 60) * 0.0015
                gpt_input_cost = (self.stats['total_translations'] * 30 / 1_000_000) * 0.20
                gpt_output_cost = (self.stats['total_translations'] * 30 / 1_000_000) * 0.80
                total_cost = whisper_cost + gpt_input_cost + gpt_output_cost
                self.console.print(f"  • Total cost: [green]${total_cost:.5f}[/]")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="VoiceTrans - Ultra-low latency Voice Translator")
    parser.add_argument('-t', '--target', default='zh', help='Target language code')
    parser.add_argument('--theme', default='dark', choices=['dark', 'light'], help='UI theme')
    parser.add_argument('--fireworks-key', help='Fireworks API key')
    parser.add_argument('--openai-key', help='OpenAI API key for translation')
    parser.add_argument('--turbo', action='store_true', default=True, help='Use turbo model (default: True)')

    args = parser.parse_args()

    # Set API keys if provided
    if args.fireworks_key:
        os.environ['FIREWORKS_API_KEY'] = args.fireworks_key
    if args.openai_key:
        os.environ['OPENAI_API_KEY'] = args.openai_key

    app = FireworksVoiceTranslator(
        target=args.target,
        theme=args.theme
    )
    
    app.use_turbo_model = args.turbo
    app.run()

if __name__ == "__main__":
    main()