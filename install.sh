#!/bin/bash

# VoiceTrans Installation Script - Improved Version
# This script installs VoiceTrans with better dependency handling

echo "======================================"
echo "VoiceTrans Installation Script"
echo "======================================"
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ Detected macOS"
    IS_MACOS=true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✓ Detected Linux"
    IS_MACOS=false
else
    echo "⚠️  Warning: Unsupported OS. This script is designed for macOS/Linux"
    IS_MACOS=false
fi

# Check for Python 3.8+
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    echo "✓ Python $PYTHON_VERSION found"
else
    echo "❌ Python 3 not found. Please install Python 3.8+ first."
    exit 1
fi

# Function to install PortAudio on macOS
install_portaudio_mac() {
    echo ""
    echo "Step 1: Installing PortAudio (required for audio input)..."

    if command -v brew &> /dev/null; then
        if ! brew list portaudio &>/dev/null; then
            echo "Installing PortAudio via Homebrew..."
            brew install portaudio
        else
            echo "✓ PortAudio already installed"
        fi
        # Set environment variables for PyAudio compilation
        export LDFLAGS="-L$(brew --prefix portaudio)/lib"
        export CFLAGS="-I$(brew --prefix portaudio)/include"
        echo "✓ Set compilation flags for PyAudio"
        return 0
    else
        echo "❌ Homebrew not found. Please install PortAudio manually:"
        echo "    1. Install Homebrew from https://brew.sh"
        echo "    2. Run: brew install portaudio"
        return 1
    fi
}

# Function to install dependencies step by step
install_dependencies_stepwise() {
    echo ""
    echo "Step 2: Installing Python dependencies..."

    # Upgrade pip first
    pip install --upgrade pip

    # Install setuptools first (required for Python 3.13+)
    echo "  Installing setuptools..."
    pip install setuptools

    # Install non-problematic dependencies first
    echo "  Installing core dependencies..."
    pip install "openai>=1.0.0"
    pip install "google-genai>=0.1.0"
    pip install "numpy>=1.20.0"
    pip install "rich>=13.0.0"
    pip install "webrtcvad>=2.0.10"
    pip install "pynput>=1.7.0"
    pip install "websocket-client>=1.0.0"
    pip install certifi

    # Try to install PyAudio last (most likely to fail)
    echo "  Installing PyAudio (this may take a moment)..."
    if [[ "$IS_MACOS" == true ]]; then
        # On macOS, try with the environment variables set
        if ! pip install "pyaudio>=0.2.11"; then
            echo ""
            echo "⚠️  PyAudio installation failed. Trying alternative methods..."

            # Try installing from conda-forge if conda is available
            if command -v conda &> /dev/null; then
                echo "  Trying conda-forge..."
                conda install -c conda-forge pyaudio -y
            else
                echo "❌ PyAudio installation failed. Audio input will not work."
                echo "   To fix this later, run:"
                echo "   brew install portaudio && pip install pyaudio"
                return 1
            fi
        fi
    else
        # On Linux, just try pip
        if ! pip install "pyaudio>=0.2.11"; then
            echo "⚠️  PyAudio installation failed. You may need to install PortAudio:"
            echo "   Ubuntu/Debian: sudo apt-get install portaudio19-dev"
            echo "   Fedora: sudo dnf install portaudio-devel"
            return 1
        fi
    fi

    echo "✓ All dependencies installed successfully"
    return 0
}

# Function to create virtual environment
create_venv() {
    echo ""
    echo "Creating virtual environment for VoiceTrans..."

    # Create and activate virtual environment
    python3 -m venv venv
    source venv/bin/activate

    # Install PortAudio on macOS first
    if [[ "$IS_MACOS" == true ]]; then
        if ! install_portaudio_mac; then
            echo "⚠️  Warning: PortAudio installation failed. PyAudio may not work properly."
            echo "You can continue, but audio input might not function."
            read -p "Continue anyway? (y/N): " cont
            if [[ ! $cont =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    # Install dependencies step by step
    install_dependencies_stepwise

    # Now install the package itself (without dependencies since we already installed them)
    echo ""
    echo "Step 3: Installing VoiceTrans package..."
    pip install --no-deps -e .

    # Create wrapper script
    WRAPPER_SCRIPT="/usr/local/bin/vtrans"
    VTRANS_DIR=$(pwd)

    echo ""
    echo "Step 4: Creating global vtrans command..."
    cat > /tmp/vtrans_wrapper << EOF
#!/bin/bash
# VoiceTrans wrapper script - automatically activates virtual environment

# Get the VoiceTrans installation directory
VTRANS_DIR="$VTRANS_DIR"

# Activate virtual environment and run vtrans
source "\$VTRANS_DIR/venv/bin/activate"
python -m voicetrans.cli "\$@"
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

    echo "✅ VoiceTrans installed with virtual environment"
}

# Main installation logic
main() {
    # Check if conda is available and preferred
    if command -v conda &> /dev/null; then
        echo "✓ Conda detected"
        echo ""
        echo "Installation options:"
        echo "1) Use conda environment (recommended for conda users)"
        echo "2) Use Python virtual environment (venv)"
        echo ""
        read -p "Choose installation method (1 or 2): " conda_choice

        if [[ "$conda_choice" == "1" ]]; then
            # Check if voicetrans environment exists
            if conda env list | grep -q "voicetrans"; then
                echo "✓ VoiceTrans conda environment found"
                echo ""
                echo "Updating VoiceTrans in conda environment..."

                # Activate the environment
                eval "$(conda shell.bash hook)"
                conda activate voicetrans
            else
                echo ""
                echo "Creating VoiceTrans conda environment..."
                conda create -n voicetrans python=3.11 -y
                eval "$(conda shell.bash hook)"
                conda activate voicetrans
            fi

            # Install PortAudio through conda first on macOS
            if [[ "$IS_MACOS" == true ]]; then
                echo "Installing PortAudio via conda..."
                conda install -c conda-forge portaudio -y
            fi

            # Install dependencies step by step
            install_dependencies_stepwise

            # Install the package
            echo ""
            echo "Installing VoiceTrans package..."
            pip install --no-deps -e .

            # Create wrapper script for conda
            WRAPPER_SCRIPT="/usr/local/bin/vtrans"
            echo "Creating wrapper script at $WRAPPER_SCRIPT..."

            cat > /tmp/vtrans_wrapper << 'EOF'
#!/bin/bash
# VoiceTrans wrapper script - automatically activates conda environment

if command -v conda &> /dev/null; then
    # Activate conda and run vtrans
    eval "$(conda shell.bash hook)"
    conda activate voicetrans
    python -m voicetrans.cli "$@"
else
    echo "❌ Conda not found. Please ensure conda is in your PATH"
    exit 1
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

            echo "✅ VoiceTrans installed with conda environment"
        else
            create_venv
        fi
    else
        # No conda, check for externally-managed environment
        echo ""
        echo "Checking Python environment..."

        # Test if pip install would fail due to externally managed environment
        if ! pip3 install --dry-run setuptools &>/dev/null; then
            ERROR_MSG=$(pip3 install --dry-run setuptools 2>&1)
            if echo "$ERROR_MSG" | grep -q "externally-managed-environment\|EXTERNALLY-MANAGED"; then
                echo ""
                echo "⚠️  Detected externally-managed Python environment"
                echo "A virtual environment is required for installation."
                echo ""
                create_venv
            else
                echo "Installation check failed with error:"
                echo "$ERROR_MSG"
                exit 1
            fi
        else
            # No restrictions, but still recommend venv
            echo ""
            echo "Installation options:"
            echo "1) Create virtual environment (Recommended)"
            echo "2) Install in system Python"
            echo ""
            read -p "Choose installation method (1 or 2): " venv_choice

            if [[ "$venv_choice" == "2" ]]; then
                # Install PortAudio on macOS
                if [[ "$IS_MACOS" == true ]]; then
                    if ! install_portaudio_mac; then
                        echo "⚠️  Warning: PortAudio installation failed."
                        read -p "Continue anyway? (y/N): " cont
                        if [[ ! $cont =~ ^[Yy]$ ]]; then
                            exit 1
                        fi
                    fi
                fi

                echo "Installing VoiceTrans in system Python..."
                install_dependencies_stepwise
                pip3 install --no-deps -e .
            else
                create_venv
            fi
        fi
    fi
}

# Run main installation
main

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

# Test if vtrans command is available
if command -v vtrans &> /dev/null; then
    echo "✅ vtrans command is ready to use!"
else
    echo "⚠️  vtrans command not found in PATH. You may need to:"
    echo "   - Restart your terminal"
    echo "   - Or add the installation directory to your PATH"
fi