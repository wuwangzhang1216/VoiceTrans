#!/usr/bin/env python3
"""
VoiceTrans - Professional Real-time Voice Translator
Setup script for system-wide installation
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the README file
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text()

setup(
    name="voicetrans",
    version="1.0.0",
    author="VoiceTrans",
    description="Professional Real-time Voice Translator with ultra-low latency",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/VoiceTrans",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "setuptools",  # Required for pkg_resources in Python 3.13
        "openai>=1.0.0",  # For Fireworks AI transcription
        "google-genai>=0.1.0",  # For Google Gemini translation
        "pyaudio>=0.2.11",
        "webrtcvad>=2.0.10",
        "rich>=13.0.0",
        "numpy>=1.20.0",
        "pynput>=1.7.0",
        "websocket-client>=1.0.0",
        "certifi",
    ],
    entry_points={
        "console_scripts": [
            "vtrans=voicetrans.cli:main",
            "voicetrans=voicetrans.cli:main",
        ],
    },
    include_package_data=True,
    package_data={
        "voicetrans": ["config.json.template"],
    },
)