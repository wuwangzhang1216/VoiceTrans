#!/bin/bash

# VoiceTrans Uninstallation Script
# This script removes VoiceTrans from your system

echo "======================================"
echo "VoiceTrans Uninstallation Script"
echo "======================================"
echo ""

# Confirm uninstallation
read -p "Are you sure you want to uninstall VoiceTrans? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo ""
echo "Uninstalling VoiceTrans..."
echo ""

# Track what was removed
REMOVED_ITEMS=()

# Remove the vtrans command from /usr/local/bin
if [ -f "/usr/local/bin/vtrans" ]; then
    echo "Removing vtrans command..."
    if [[ -w "/usr/local/bin" ]]; then
        rm -f /usr/local/bin/vtrans
    else
        sudo rm -f /usr/local/bin/vtrans
    fi
    REMOVED_ITEMS+=("✓ Removed vtrans command")
fi

# Remove pip installation
if pip3 show voicetrans &> /dev/null; then
    echo "Removing pip package..."
    pip3 uninstall voicetrans -y &> /dev/null
    REMOVED_ITEMS+=("✓ Removed pip package")
fi

# Check if conda environment should be removed
if command -v conda &> /dev/null; then
    if conda env list | grep -q "voicetrans"; then
        echo ""
        read -p "Remove conda environment 'voicetrans'? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Removing conda environment..."
            conda env remove -n voicetrans -y
            REMOVED_ITEMS+=("✓ Removed conda environment")
        else
            REMOVED_ITEMS+=("✗ Kept conda environment (remove manually with: conda env remove -n voicetrans)")
        fi
    fi
fi

# Check for config files
echo ""
echo "Checking for configuration files..."

# Check current directory config
if [ -f "config.json" ]; then
    read -p "Remove local config.json? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f config.json
        REMOVED_ITEMS+=("✓ Removed local config.json")
    else
        REMOVED_ITEMS+=("✗ Kept local config.json")
    fi
fi

# Check home directory config
HOME_CONFIG="$HOME/.voicetrans_config.json"
if [ -f "$HOME_CONFIG" ]; then
    read -p "Remove user config file (~/.voicetrans_config.json)? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$HOME_CONFIG"
        REMOVED_ITEMS+=("✓ Removed user config file")
    else
        REMOVED_ITEMS+=("✗ Kept user config file")
    fi
fi

# Check for session files
SESSION_FILES=$(ls voice_translation_*.txt 2>/dev/null | wc -l)
if [ "$SESSION_FILES" -gt 0 ]; then
    echo ""
    echo "Found $SESSION_FILES session file(s)"
    read -p "Remove all session files (voice_translation_*.txt)? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f voice_translation_*.txt
        REMOVED_ITEMS+=("✓ Removed $SESSION_FILES session file(s)")
    else
        REMOVED_ITEMS+=("✗ Kept session files")
    fi
fi

# Remove from site-packages if installed there
SITE_PACKAGES=$(python3 -c "import site; print(site.getsitepackages()[0])" 2>/dev/null)
if [ -d "$SITE_PACKAGES/voicetrans" ]; then
    echo "Removing from site-packages..."
    if [[ -w "$SITE_PACKAGES" ]]; then
        rm -rf "$SITE_PACKAGES/voicetrans"
        rm -f "$SITE_PACKAGES/voicetrans.egg-link"
    else
        sudo rm -rf "$SITE_PACKAGES/voicetrans"
        sudo rm -f "$SITE_PACKAGES/voicetrans.egg-link"
    fi
    REMOVED_ITEMS+=("✓ Removed from site-packages")
fi

# Check user site-packages
USER_SITE=$(python3 -m site --user-site 2>/dev/null)
if [ -d "$USER_SITE/voicetrans" ]; then
    echo "Removing from user site-packages..."
    rm -rf "$USER_SITE/voicetrans"
    rm -f "$USER_SITE/voicetrans.egg-link"
    REMOVED_ITEMS+=("✓ Removed from user site-packages")
fi

# Clean up egg-info directories in current directory
if ls voicetrans.egg-info 1> /dev/null 2>&1; then
    rm -rf voicetrans.egg-info
    REMOVED_ITEMS+=("✓ Removed egg-info directory")
fi

echo ""
echo "======================================"
echo "Uninstallation Summary"
echo "======================================"
echo ""

if [ ${#REMOVED_ITEMS[@]} -eq 0 ]; then
    echo "VoiceTrans was not installed or already removed."
else
    echo "The following items were processed:"
    echo ""
    for item in "${REMOVED_ITEMS[@]}"; do
        echo "  $item"
    done
fi

echo ""
echo "======================================"
echo "Uninstallation Complete"
echo "======================================"
echo ""

# Provide reinstallation instructions
echo "To reinstall VoiceTrans, run:"
echo "  ./install.sh"
echo ""
echo "The source code in this directory has been preserved."
echo "Only the installed components were removed."
echo ""