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

# Function to create virtual environment
create_venv() {
    echo ""
    echo "Creating virtual environment for VoiceTrans..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -e .

    # Create wrapper script
    WRAPPER_SCRIPT="/usr/local/bin/vtrans"
    VTRANS_DIR=$(pwd)

    echo "Creating wrapper script at $WRAPPER_SCRIPT..."
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
    echo "⚠️  Conda not detected"

    # Try to install and check if we get an externally-managed error
    echo ""
    echo "Checking Python environment..."

    # Test if pip install would fail due to externally managed environment
    if ! pip3 install --dry-run -e . &>/dev/null; then
        # Check if it's specifically an externally-managed error
        ERROR_MSG=$(pip3 install --dry-run -e . 2>&1)
        if echo "$ERROR_MSG" | grep -q "externally-managed-environment\|EXTERNALLY-MANAGED"; then
            echo ""
            echo "⚠️  Detected externally-managed Python environment (PEP 668)"
            echo "This is common with Python 3.11+ installed via Homebrew or system package manager."
            echo ""
            echo "Please choose an installation method:"
            echo "1) Create a virtual environment (Recommended)"
            echo "2) Install with pipx (if available)"
            echo "3) Install with --user flag"
            echo "4) Force system-wide installation (Not recommended)"
            echo ""
            read -p "Enter your choice (1-4): " choice

            case $choice in
                1)
                    create_venv
                    ;;
                2)
                    if command -v pipx &> /dev/null; then
                        echo "Installing with pipx..."
                        pipx install -e .
                        echo "✅ VoiceTrans installed with pipx"
                    else
                        echo "pipx not found. Install it with: brew install pipx"
                        echo "Then run this installer again and choose option 2."
                        exit 1
                    fi
                    ;;
                3)
                    echo "Installing with --user flag..."
                    pip3 install --user -e .

                    # Check if user site-packages is in PATH
                    USER_BIN=$(python3 -m site --user-base)/bin
                    if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
                        echo ""
                        echo "⚠️  Warning: $USER_BIN is not in your PATH"
                        echo "Add this to your ~/.bashrc or ~/.zshrc:"
                        echo "  export PATH=\"$USER_BIN:\$PATH\""
                    fi
                    ;;
                4)
                    echo "⚠️  Warning: This may break your system Python!"
                    read -p "Are you sure? (y/N): " confirm
                    if [[ $confirm == "y" || $confirm == "Y" ]]; then
                        pip3 install --break-system-packages -e .
                    else
                        echo "Installation cancelled."
                        exit 1
                    fi
                    ;;
                *)
                    echo "Invalid choice. Installation cancelled."
                    exit 1
                    ;;
            esac
        else
            # Some other error occurred
            echo "Installation failed with error:"
            echo "$ERROR_MSG"
            exit 1
        fi
    else
        # No externally-managed environment, proceed with normal installation
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

# Test if vtrans command is available
if command -v vtrans &> /dev/null; then
    echo "✅ vtrans command is ready to use!"
else
    echo "⚠️  vtrans command not found in PATH. You may need to:"
    echo "   - Restart your terminal"
    echo "   - Or add the installation directory to your PATH"
fi