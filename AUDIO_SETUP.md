# Audio Setup Guide for VoiceTrans

## macOS Users

If you encounter PyAudio installation errors, follow these steps:

### 1. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install PortAudio
```bash
brew install portaudio
```

### 3. Set Environment Variables
```bash
# For Apple Silicon (M1/M2/M3) Macs:
export LDFLAGS="-L/opt/homebrew/lib"
export CFLAGS="-I/opt/homebrew/include"

# For Intel Macs:
export LDFLAGS="-L/usr/local/lib"
export CFLAGS="-I/usr/local/include"
```

### 4. Install PyAudio in Virtual Environment
```bash
# Activate your virtual environment first
source venv/bin/activate

# Then install PyAudio with the environment variables set
pip install pyaudio
```

### Alternative: Install Pre-built PyAudio
If the above doesn't work, try:
```bash
# Using conda (if available)
conda install -c conda-forge pyaudio

# Or using pipwin (Windows/Mac)
pip install pipwin
pipwin install pyaudio
```

## Linux Users

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install portaudio19-dev python3-pyaudio
```

### Fedora/RHEL
```bash
sudo dnf install portaudio-devel
```

### Arch Linux
```bash
sudo pacman -S portaudio
```

## Troubleshooting

### Error: "portaudio.h not found"
This means PortAudio is not installed or not in the include path. Install it using your package manager.

### Error: "Failed building wheel for pyaudio"
1. Ensure PortAudio is installed
2. Set the correct environment variables
3. Try installing from conda-forge instead

### Test PyAudio Installation
```python
import pyaudio
p = pyaudio.PyAudio()
print(f"PyAudio version: {pyaudio.get_portaudio_version_text()}")
print(f"Available devices: {p.get_device_count()}")
p.terminate()
```

## Working Without PyAudio

If you cannot install PyAudio, VoiceTrans can still work with:
- File input mode (process audio files instead of microphone)
- WebSocket mode (receive audio from external sources)

To use without microphone input, set `USE_MICROPHONE=false` in your config.