# VoiceTrans Web Application

A professional web application for real-time voice translation powered by Fireworks AI and Google Gemini.

## Features

- 🎤 **Real-time Voice Recording**: Capture audio directly from your browser
- 🌍 **Multi-language Support**: Translate to 19+ languages
- ⚡ **Ultra-low Latency**: Fast transcription using Fireworks AI
- 🎨 **Modern UI**: Built with React, Tailwind CSS, and Headless UI
- 📊 **Statistics Tracking**: Monitor translation performance and usage
- 🔄 **WebSocket Support**: Real-time streaming capabilities
- 🐳 **Docker Ready**: Easy deployment with Docker Compose

## Architecture

```
web_app/
├── backend/          # FastAPI backend server
│   ├── main.py      # API endpoints and WebSocket handlers
│   └── requirements.txt
├── frontend/         # React TypeScript application
│   ├── src/
│   │   ├── components/  # UI components
│   │   └── App.tsx      # Main application
│   └── package.json
├── docker-compose.yml   # Docker orchestration
└── nginx.conf          # Nginx reverse proxy config
```

## Prerequisites

- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)
- Docker & Docker Compose (for containerized deployment)
- API Keys:
  - Fireworks API key (get from [fireworks.ai](https://fireworks.ai))
  - Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Quick Start

### Option 1: Docker Deployment (Recommended)

1. Clone the repository and navigate to the web_app directory:
```bash
cd web_app
```

2. Copy the environment example file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your API keys:
```env
FIREWORKS_API_KEY=your_fireworks_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the application with Docker Compose:
```bash
docker-compose up -d
```

5. Access the application at `http://localhost`

### Option 2: Local Development

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set environment variables:
```bash
export FIREWORKS_API_KEY=your_key_here
export GEMINI_API_KEY=your_key_here
```

5. Run the backend server:
```bash
uvicorn main:app --reload --port 8000
```

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Access the application at `http://localhost:3000`

## API Endpoints

### REST API

- `GET /` - API status and statistics
- `GET /languages` - List supported languages
- `POST /config` - Update API configuration
- `POST /translate` - Translate audio file
- `GET /stats` - Get translation statistics

### WebSocket

- `WS /ws` - Real-time audio streaming endpoint

## Usage Guide

1. **Initial Setup**:
   - Click the settings icon in the header
   - Enter your Fireworks and Gemini API keys
   - Save the configuration

2. **Recording Audio**:
   - Select your target language from the dropdown
   - Click the microphone button to start recording
   - Speak clearly into your microphone
   - Click the stop button when finished

3. **View Translations**:
   - The original transcription and translation appear immediately
   - View translation history below the main interface
   - Monitor statistics in the right sidebar

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **OpenAI SDK**: For Fireworks AI integration
- **Google GenAI**: For translation services
- **Uvicorn**: ASGI server
- **WebSockets**: Real-time communication

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Headless UI**: Unstyled, accessible UI components
- **Vite**: Fast build tool
- **Axios**: HTTP client

## Configuration

### Backend Configuration

The backend can be configured through environment variables:

```env
FIREWORKS_API_KEY=fw_...
GEMINI_API_KEY=AIza...
```

Or through a `config.json` file in the backend directory:

```json
{
  "fireworks_api_key": "fw_...",
  "gemini_api_key": "AIza...",
  "default_target_language": "zh"
}
```

### Frontend Configuration

The frontend proxy configuration is in `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

## Production Deployment

### Using Docker

1. Build production images:
```bash
docker-compose build
```

2. Run in production mode:
```bash
docker-compose up -d
```

### Manual Deployment

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend
```bash
cd frontend
npm ci
npm run build
npm install -g serve
serve -s dist -l 3000
```

## Performance Optimization

- **Audio Processing**: 16kHz mono audio for optimal quality/size balance
- **Concurrent Processing**: ThreadPoolExecutor for parallel API calls
- **Caching**: Frontend caches language list and configuration
- **WebSocket**: For real-time streaming without HTTP overhead

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **CORS**: Configure allowed origins in production
3. **HTTPS**: Use SSL/TLS in production deployment
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: All inputs are validated with Pydantic

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**:
   - Check browser permissions
   - Ensure HTTPS in production (required for getUserMedia)

2. **API Connection Failed**:
   - Verify API keys are correct
   - Check network connectivity
   - Ensure backend is running

3. **No Audio Input**:
   - Check system audio settings
   - Verify microphone is connected
   - Test with browser's audio recorder

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See parent LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check the main VoiceTrans documentation
- Review API documentation for Fireworks and Gemini