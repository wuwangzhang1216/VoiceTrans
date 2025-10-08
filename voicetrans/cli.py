#!/usr/bin/env python3
"""
VoiceTrans CLI - Command line interface for VoiceTrans
"""

import os
import sys
import argparse
from pathlib import Path

def main():
    """Main CLI entry point for VoiceTrans"""
    parser = argparse.ArgumentParser(
        description="VoiceTrans - Ultra-low latency Voice Translator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  vtrans                    # Start with default settings
  vtrans -t es             # Translate to Spanish
  vtrans --theme light     # Use light theme
  vtrans --config          # Show config file location
  vtrans --version         # Show version information
        """
    )

    parser.add_argument('-t', '--target',
                       default=None,
                       help='Target language code (e.g., zh, es, fr)')
    parser.add_argument('--theme',
                       default=None,
                       choices=['dark', 'light'],
                       help='UI theme')
    parser.add_argument('--fireworks-key',
                       help='Fireworks API key')
    parser.add_argument('--gemini-key',
                       help='Google Gemini API key for translation')
    parser.add_argument('--openai-key',
                       help='[Deprecated] Use --gemini-key instead')
    parser.add_argument('--turbo',
                       action='store_true',
                       default=None,
                       help='Use turbo model for faster processing')
    parser.add_argument('--config',
                       action='store_true',
                       help='Show config file location and exit')
    parser.add_argument('--version',
                       action='store_true',
                       help='Show version and exit')
    parser.add_argument('--setup',
                       action='store_true',
                       help='Run interactive setup')

    args = parser.parse_args()

    # Handle version flag
    if args.version:
        from voicetrans import __version__
        print(f"VoiceTrans v{__version__}")
        sys.exit(0)

    # Handle config flag
    if args.config:
        config_path = Path.cwd() / "config.json"
        template_path = Path(__file__).parent / "config.json.template"
        print(f"Config file location: {config_path}")
        print(f"Template location: {template_path}")
        if not config_path.exists():
            print("\nConfig file not found. Create one by:")
            print(f"  1. Copying the template: cp {template_path} {config_path}")
            print("  2. Or run: vtrans --setup")
        sys.exit(0)

    # Handle setup flag
    if args.setup:
        run_setup()
        sys.exit(0)

    # Set API keys if provided
    if args.fireworks_key:
        os.environ['FIREWORKS_API_KEY'] = args.fireworks_key
    if args.gemini_key:
        os.environ['GEMINI_API_KEY'] = args.gemini_key
    elif args.openai_key:  # Backward compatibility
        os.environ['GEMINI_API_KEY'] = args.openai_key
        print("Warning: --openai-key is deprecated. Please use --gemini-key instead.")

    # Import and run the main app
    from voicetrans.app import FireworksVoiceTranslator

    # Prepare kwargs from arguments
    kwargs = {}
    if args.target:
        kwargs['target'] = args.target
    if args.theme:
        kwargs['theme'] = args.theme

    # Create and run the app
    app = FireworksVoiceTranslator(**kwargs)

    # Set turbo mode if specified
    if args.turbo is not None:
        app.use_turbo_model = args.turbo

    # Run the application
    try:
        app.run()
    except KeyboardInterrupt:
        print("\n\nGoodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

def run_setup():
    """Interactive setup for VoiceTrans"""
    from pathlib import Path
    import json

    print("=" * 60)
    print("VoiceTrans Interactive Setup")
    print("=" * 60)

    config_path = Path.cwd() / "config.json"

    # Check if config already exists
    if config_path.exists():
        overwrite = input(f"\nConfig file already exists at {config_path}.\nOverwrite? (y/N): ").strip().lower()
        if overwrite != 'y':
            print("Setup cancelled.")
            return

    print("\nLet's set up your API keys:")
    print("-" * 40)

    # Get Fireworks API key
    print("\n1. Fireworks API Key (for transcription)")
    print("   Get your free key at: https://app.fireworks.ai/settings/users/api-keys")
    print("   (Sign up for free, no credit card required)")
    fireworks_key = input("   Enter your Fireworks API key: ").strip()

    # Get Gemini API key
    print("\n2. Google Gemini API Key (for translation)")
    print("   Get your free key at: https://aistudio.google.com/apikey")
    print("   (Free tier available, no credit card required)")
    gemini_key = input("   Enter your Gemini API key (or press Enter to skip): ").strip()

    # Get preferences
    print("\n3. Default Settings")
    print("-" * 40)

    # Target language
    print("\nAvailable languages: zh (Chinese), es (Spanish), fr (French), de (German),")
    print("                    ja (Japanese), ko (Korean), ru (Russian), ar (Arabic), etc.")
    target_lang = input("Default target language [zh]: ").strip() or "zh"

    # Theme
    theme = input("Theme (dark/light) [dark]: ").strip() or "dark"

    # Speed mode
    print("\nSpeed modes: Hyper-Speed (fastest), Ultra-Fast (optimized), Balanced (reliable), Accurate (best quality)")
    sensitivity = input("Default speed mode [Balanced]: ").strip() or "Balanced"

    # Create config
    config = {
        "fireworks_api_key": fireworks_key,
        "gemini_api_key": gemini_key,
        "default_target_language": target_lang,
        "theme": theme,
        "sensitivity_mode": sensitivity,
        "use_turbo_model": True,
        "use_vad_optimization": True,
        "show_history": True,
        "show_stats": True
    }

    # Save config
    try:
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"\n✅ Config saved to: {config_path}")
        print("\nYou can now run 'vtrans' to start VoiceTrans!")
    except Exception as e:
        print(f"\n❌ Error saving config: {e}")

if __name__ == "__main__":
    main()