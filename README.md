# VoiceTrans

🚀 **Professional Real-time Voice Translator** - Ultra-low latency voice translation with advanced AI

## 📸 Interface Preview
<img width="2652" height="1801" alt="image" src="https://github.com/user-attachments/assets/81143700-6582-40de-bd1c-02e86097d6c5" />


<img width="1340" height="695" alt="image" src="https://github.com/user-attachments/assets/f6b57aa4-72b3-42a1-bf90-c38b455734dc" />


### 🎨 UI Features

- **Real-time Dashboard**: Live transcription and translation display
- **Dynamic Layout**: Hide/show panels for optimal viewing (press H to toggle history)
- **Performance Metrics**: Track latency, speed, and cost in real-time
- **Audio Visualization**: Visual feedback of audio input levels
- **Color-coded Latency**:
  - 🟢 Green: < 0.5s (Ultra-fast)
  - 🟡 Yellow: 0.5-1s (Fast)
  - 🔴 Red: > 1s (Normal)

## ✨ Features

### Core Capabilities
- ⚡ **Ultra-fast transcription** - Sub-second latency for real-time conversation
- 🌍 **19+ Languages** - Support for major world languages with auto-detection
- 🎯 **Smart VAD** - WebRTC Voice Activity Detection for precise speech capture
- 📊 **Live Dashboard** - Professional terminal UI with real-time metrics

### Advanced Features
- 🚀 **Multiple Speed Modes**
  - Hyper-Speed: Minimum latency for instant translation
  - Ultra-Fast: Optimized performance
  - Balanced: Reliable detection (default)
  - Accurate: Enhanced accuracy for complex speech
- 📈 **Performance Metrics**
  - Real-time latency tracking
  - Processing speed (x realtime)
  - Cost tracking per session
  - Time saved calculations
- 💾 **Session Management**
  - Auto-save conversation history
  - Export to formatted text files
  - Last 100 translations cached
- 🎨 **Dynamic UI**
  - Hide/show panels for optimal viewing
  - Audio level visualization
  - Color-coded latency indicators

## 🚀 Quick Start

VoiceTrans offers two deployment options:
1. **Terminal App** - Command-line interface for desktop use
2. **Web App** - Modern web interface with luxury design

### Terminal App Installation

#### Option 1: Quick Install (Recommended)
```bash
# Clone and install
git clone https://github.com/wuwangzhang1216/VoiceTrans.git
cd VoiceTrans
chmod +x install.sh  # Make install script executable
./install.sh

# Run interactive setup
vtrans --setup

# Start using VoiceTrans
vtrans
```

#### Option 2: Manual Installation
```bash
# Clone the repository
git clone https://github.com/wuwangzhang1216/VoiceTrans.git
cd VoiceTrans

# Create conda environment (optional but recommended)
conda create -n voicetrans python=3.11
conda activate voicetrans

# Install as a package
pip install -e .

# The 'vtrans' command is now available globally
vtrans --help
```

#### Option 3: Traditional Setup
```bash
# Clone the repository
git clone https://github.com/wuwangzhang1216/VoiceTrans.git
cd VoiceTrans

# Set up conda environment
conda create -n voicetrans python=3.11
conda activate voicetrans

# Install dependencies
pip install -r requirements.txt

# Run directly with Python
python voicetrans/app.py
```

### Configuration

#### 🔑 Get Your API Keys

1. **Fireworks API Key** (for transcription - recommended):
   - Get your free key at: https://app.fireworks.ai/settings/users/api-keys
   - Sign up for free, no credit card required
   - Provides ultra-fast transcription (23x faster than OpenAI)

2. **Google Gemini API Key** (for translation):
   - Get your free key at: https://aistudio.google.com/apikey
   - Sign up for free, no credit card required
   - Uses Gemini 2.5 Flash Lite Preview for fast, cost-effective translation

**Option A: Interactive Setup (Easiest)**
```bash
vtrans --setup
```

**Option B: Using config.json**
```bash
# Copy the template in your working directory
cp /path/to/VoiceTrans/config.json.template config.json

# Edit config.json with your API keys
nano config.json  # or use your preferred editor
```

**Option C: Environment variables**
```bash
# For transcription (Fireworks AI recommended for speed)
export FIREWORKS_API_KEY="your-fireworks-key"

# For translation (Google Gemini)
export GEMINI_API_KEY="your-gemini-key"
```

### Usage

After installation, you can run VoiceTrans from anywhere using the `vtrans` command:

```bash
# Start VoiceTrans with default settings
vtrans

# Specify target language
vtrans -t es  # Translate to Spanish
vtrans -t ja  # Translate to Japanese

# Use light theme
vtrans --theme light

# Show help and all options
vtrans --help

# Run interactive setup
vtrans --setup

# Check config file location
vtrans --config

# With custom API keys
vtrans --fireworks-key "your-key" --gemini-key "your-key"
```

VoiceTrans will look for `config.json` in your current directory first, allowing you to have different configurations for different projects.

---

## 🌐 Web Application

### Features
- 🎨 **Luxury Black & Gold Design** - Premium UI with elegant animations
- 🎤 **Real-time Voice Translation** - Stream audio directly from your browser
- 📊 **Translation History** - Timeline view with export functionality
- 🌍 **Multi-language Support** - 19+ languages available
- ⚡ **Ultra-low Latency** - WebSocket streaming for instant results
- 📱 **Responsive Design** - Works on desktop and mobile devices

### Quick Start (Web App)

#### Option 1: Docker Deployment (Recommended)

```bash
# Navigate to web app directory
cd web_app

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# FIREWORKS_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost
```

#### Option 2: Local Development

**Backend Setup:**
```bash
cd web_app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set API keys
export FIREWORKS_API_KEY=your_key_here
export GEMINI_API_KEY=your_key_here

# Run backend server
uvicorn main:app --reload --port 8000
```

**Frontend Setup (in a new terminal):**
```bash
cd web_app/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5173
```

### Using the Web App

1. **Initial Setup**
   - Click the ⚙️ Settings icon
   - Enter your Fireworks and Gemini API keys
   - Save configuration

2. **Start Translating**
   - Select target language from dropdown
   - Click the golden "START" button
   - Grant microphone permissions when prompted
   - Speak clearly into your microphone
   - View real-time translations in the elegant interface

3. **Manage History**
   - View recent translations in the timeline at the bottom
   - Click "EXPORT" to download all translations as TXT
   - Click "CLEAR" to remove all history

### Web App Architecture
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: FastAPI + WebSocket streaming
- **Audio**: Web Audio API with AudioWorklet for low-latency processing
- **Deployment**: Docker Compose with Nginx reverse proxy

See [web_app/README.md](web_app/README.md) for detailed documentation.

---

## ⌨️ Keyboard Controls (Terminal App)

| Key | Action | Description |
|-----|--------|-------------|
| **Space** | Pause/Resume | Toggle recording on/off |
| **L** | Language | Change target language |
| **H** | History | Toggle history panel visibility |
| **S** | Stats | Toggle statistics panel |
| **Enter** | Save | Export session to text file |
| **Q** | Quit | Exit application |

### Speed Controls
| Key | Mode | Description |
|-----|------|-------------|
| **+** | Hyper-Speed | Minimum latency mode |
| **-** | Accurate | Better accuracy mode |
| **=** | Ultra-Fast | Optimized performance |
| **0** | Balanced | Reliable detection (default) |

## 🌍 Supported Languages

| Code | Language | Flag | Code | Language | Flag |
|------|----------|------|------|----------|------|
| en | English | 🇬🇧 | ko | Korean | 🇰🇷 |
| zh | Chinese | 🇨🇳 | ru | Russian | 🇷🇺 |
| es | Spanish | 🇪🇸 | ar | Arabic | 🇸🇦 |
| fr | French | 🇫🇷 | pt | Portuguese | 🇵🇹 |
| de | German | 🇩🇪 | it | Italian | 🇮🇹 |
| ja | Japanese | 🇯🇵 | hi | Hindi | 🇮🇳 |
| nl | Dutch | 🇳🇱 | pl | Polish | 🇵🇱 |
| tr | Turkish | 🇹🇷 | sv | Swedish | 🇸🇪 |
| da | Danish | 🇩🇰 | no | Norwegian | 🇳🇴 |
| fi | Finnish | 🇫🇮 | | | |

## 📊 Performance Metrics

VoiceTrans tracks comprehensive performance metrics:

- **Latency**: Average, minimum, and peak response times
- **Speed**: Processing speed relative to real-time (e.g., 50x realtime)
- **Volume**: Total translations, words processed, API calls
- **Cost**: Real-time cost tracking per session
- **Efficiency**: Time saved compared to baseline

## 🎯 Use Cases

- **International Meetings**: Real-time translation for multilingual conferences
- **Language Learning**: Practice conversations with instant feedback
- **Customer Support**: Serve customers in their native language
- **Travel**: Navigate foreign countries with confidence
- **Content Creation**: Generate multilingual content on the fly

## 🛠️ Technical Details

### Architecture
- **Transcription**: Whisper v3 via Fireworks AI (23x faster than OpenAI)
- **Translation**: Google Gemini 2.5 Flash Lite Preview for fast, cost-effective translation
- **Audio**: PyAudio with WebRTC VAD for robust speech detection
- **UI**: Rich terminal interface with 10fps refresh rate

### Audio Processing
- Sample Rate: 16kHz mono
- Chunk Size: 480 samples (30ms)
- VAD Levels: 3 modes (Hyper/Ultra/Accurate)
- Format: 16-bit PCM

### API Configuration
- Supports both Fireworks AI and OpenAI backends
- Automatic fallback if translation API unavailable
- Multiple configuration methods:
  - `config.json` in project directory (git-ignored)
  - Environment variables
  - Interactive prompt on first run

The app loads configuration in this priority order:
1. Environment variables (highest priority)
2. `config.json` in project directory
3. `~/.voicetrans_config.json` (user home directory)
4. Interactive prompt if no keys found

### Config File Structure
```json
{
  "fireworks_api_key": "your-key-here",
  "openai_api_key": "your-key-here",
  "default_target_language": "zh",
  "theme": "dark",
  "sensitivity_mode": "Balanced",
  "use_turbo_model": true,
  "use_vad_optimization": true,
  "show_history": true,
  "show_stats": true
}
```

## 📝 Session Output

Sessions are saved with timestamps in the format:
```
voice_translation_YYYYMMDD_HHMMSS.txt
```

Each file contains:
- Complete translation history
- Timestamps and latency for each translation
- Session statistics summary
- Language pairs used

## 🗑️ Uninstallation

To remove VoiceTrans from your system:

```bash
cd VoiceTrans
./uninstall.sh
```

The uninstall script will:
- Remove the `vtrans` command
- Uninstall the pip package
- Optionally remove the conda environment
- Optionally remove config files
- Optionally remove session files
- Clean up all installation artifacts

Your source code will be preserved - only installed components are removed.

## 🔧 Troubleshooting

### Common Issues

1. **No audio input detected**
   - Check microphone permissions
   - Verify audio device selection
   - Adjust sensitivity with +/- keys

2. **High latency**
   - Switch to Hyper-Speed mode (+)
   - Check internet connection
   - Ensure API keys are valid

3. **API errors**
   - Verify API keys are set correctly
   - Check API rate limits
   - Ensure sufficient API credits

## 📄 Requirements

- Python 3.8+
- macOS/Linux/Windows
- Working microphone
- Internet connection
- API keys (Fireworks AI and/or OpenAI)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📜 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Powered by Whisper v3 for transcription
- Google Gemini for translation
- WebRTC VAD for voice detection
- Rich library for terminal UI

---

**VoiceTrans** - Breaking language barriers with ultra-low latency voice translation
