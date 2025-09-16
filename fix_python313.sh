#!/bin/bash

# Quick fix for Python 3.13 compatibility issues

echo "======================================"
echo "VoiceTrans Python 3.13 Fix"
echo "======================================"
echo ""

# Check if venv exists
if [ -d "venv" ]; then
    echo "Found virtual environment..."
    source venv/bin/activate

    echo "Installing setuptools for pkg_resources..."
    pip install setuptools

    echo ""
    echo "✅ Fix applied! Try running 'vtrans' again."
else
    echo "No virtual environment found."
    echo "Please run ./install.sh first"
fi