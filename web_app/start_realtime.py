#!/usr/bin/env python3
"""
Start the real-time translation backend server
"""

import sys
import os

# Add parent directory to path to import voicetrans modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    import uvicorn

    print("Starting VoiceTrans Real-time Backend Server...")
    print("Server will run on http://localhost:8001")
    print("WebSocket endpoint: ws://localhost:8001/ws/translate")
    print("\nMake sure to configure your API keys in config.json or environment variables:")
    print("- FIREWORKS_API_KEY")
    print("- GEMINI_API_KEY")
    print("\n" + "="*50 + "\n")

    uvicorn.run(
        "backend.main_realtime:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )