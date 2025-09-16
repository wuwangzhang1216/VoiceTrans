#!/bin/bash

# VoiceTrans Installation Script
# This script installs VoiceTrans globally so you can use 'vtrans' command from anywhere

echo "======================================"
echo "VoiceTrans Installation Script"
echo "======================================"
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✓ Detected Linux"
else
    echo "⚠️  Warning: Unsupported OS. This script is designed for macOS/Linux"
fi

# Check for Python 3.8+
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    echo "✓ Python $PYTHON_VERSION found"
else
    echo "❌ Python 3 not found. Please install Python 3.8+ first."
    exit 1
fi

# Check if conda is available
if command -v conda &> /dev/null; then
    echo "✓ Conda detected"

    # Check if voicetrans environment exists
    if conda env list | grep -q "voicetrans"; then
        echo "✓ VoiceTrans conda environment found"
        echo ""
        echo "Installing VoiceTrans in conda environment..."
        conda run -n voicetrans pip install -e .
    else
        echo ""
        echo "Creating VoiceTrans conda environment..."
        conda create -n voicetrans python=3.11 -y
        echo "Installing dependencies..."
        conda run -n voicetrans pip install -e .
    fi

    # Create wrapper script for conda activation
    WRAPPER_SCRIPT="/usr/local/bin/vtrans"
    echo "Creating wrapper script at $WRAPPER_SCRIPT..."

    cat > /tmp/vtrans_wrapper << 'EOF'
#!/bin/bash
# VoiceTrans wrapper script - automatically activates conda environment

if command -v conda &> /dev/null; then
    # Get the directory where VoiceTrans is installed
    VTRANS_DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"

    # Activate conda and run vtrans
    eval "$(conda shell.bash hook)"
    conda activate voicetrans
    python -m voicetrans.cli "$@"
else
    # Fallback to system Python
    python3 -m voicetrans.cli "$@"
fi
EOF

    # Install the wrapper script
    if [[ -w "/usr/local/bin" ]]; then
        mv /tmp/vtrans_wrapper "$WRAPPER_SCRIPT"
        chmod +x "$WRAPPER_SCRIPT"
    else
        echo "Need sudo permission to install to /usr/local/bin"
        sudo mv /tmp/vtrans_wrapper "$WRAPPER_SCRIPT"
        sudo chmod +x "$WRAPPER_SCRIPT"
    fi

else
    echo "⚠️  Conda not detected, using system Python"
    echo ""
    echo "Installing VoiceTrans with pip..."
    pip3 install -e .

    # Check if pip install location is in PATH
    PIP_BIN=$(python3 -m site --user-base)/bin
    if [[ ":$PATH:" != *":$PIP_BIN:"* ]]; then
        echo ""
        echo "⚠️  Warning: $PIP_BIN is not in your PATH"
        echo "Add this to your ~/.bashrc or ~/.zshrc:"
        echo "  export PATH=\"$PIP_BIN:\$PATH\""
    fi
fi

echo ""
echo "======================================"
echo "✅ Installation Complete!"
echo "======================================"
echo ""
echo "You can now use VoiceTrans with the 'vtrans' command:"
echo ""
echo "  vtrans              # Start VoiceTrans"
echo "  vtrans --help       # Show help"
echo "  vtrans --setup      # Run interactive setup"
echo "  vtrans --config     # Show config file location"
echo ""
echo "First time? Run 'vtrans --setup' to configure your API keys."
echo ""