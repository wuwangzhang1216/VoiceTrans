#!/bin/bash
# Script to archive old main_*.py files
# These files are no longer needed after the refactoring

echo "Archiving old main_*.py files..."

# Create archive directory
mkdir -p _archived_$(date +%Y%m%d)

# Move old files to archive
mv main_backup.py _archived_$(date +%Y%m%d)/ 2>/dev/null && echo "✓ Archived main_backup.py"
mv main_fixed.py _archived_$(date +%Y%m%d)/ 2>/dev/null && echo "✓ Archived main_fixed.py"
mv main_realtime.py _archived_$(date +%Y%m%d)/ 2>/dev/null && echo "✓ Archived main_realtime.py"
mv main_simple.py _archived_$(date +%Y%m%d)/ 2>/dev/null && echo "✓ Archived main_simple.py"
mv main_streaming.py _archived_$(date +%Y%m%d)/ 2>/dev/null && echo "✓ Archived main_streaming.py"
mv app.py _archived_$(date +%Y%m%d)/ 2>/dev/null && echo "✓ Archived app.py"

echo "Done! Old files moved to _archived_$(date +%Y%m%d)/"
echo "The new unified main.py is now the single entry point."
