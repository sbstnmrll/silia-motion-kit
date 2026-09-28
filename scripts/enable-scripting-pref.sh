#!/usr/bin/env bash
# macOS counterpart of enable-scripting-pref.ps1.
#
# Turns on Settings > Scripting & Expressions > "Allow Scripts to Write Files and
# Access Network" for one After Effects version by editing its prefs file.
# Needed only by the headless poller transport (the CEP bridge writes files from Node).
# After Effects must be closed: it rewrites the prefs file on quit.
#
#   bash scripts/enable-scripting-pref.sh 26.5
set -euo pipefail

VERSION="${1:-}"
[ -n "$VERSION" ] || { echo "usage: enable-scripting-pref.sh <version, e.g. 26.5>" >&2; exit 2; }

if pgrep -f 'Adobe After Effects 20[0-9][0-9]\.app/Contents/MacOS/After Effects' >/dev/null; then
  echo "After Effects is running. Quit it first (it overwrites the prefs file on exit)." >&2
  exit 1
fi

PREFS_ROOT="$HOME/Library/Preferences/Adobe/After Effects"
PREFS="$PREFS_ROOT/$VERSION/Adobe After Effects $VERSION Prefs-indep-general.txt"
if [ ! -f "$PREFS" ]; then
  echo "Prefs file not found: $PREFS" >&2
  echo "Installed versions: $(ls "$PREFS_ROOT" 2>/dev/null | tr '\n' ' ')" >&2
  echo "After Effects writes this file the first time it quits cleanly; open and quit it once." >&2
  exit 1
fi

BACKUP="$PREFS.bak-$(date +%Y%m%d-%H%M%S)"
cp "$PREFS" "$BACKUP"
echo "Backup: $BACKUP"

if grep -Eq '"Pref_SCRIPTING_FILE_NETWORK_SECURITY"[[:space:]]*=[[:space:]]*0*1\b' "$PREFS"; then
  echo "Already enabled."
  exit 0
fi

if grep -Eq '"Pref_SCRIPTING_FILE_NETWORK_SECURITY"[[:space:]]*=[[:space:]]*0*0\b' "$PREFS"; then
  perl -pi -e 's/("Pref_SCRIPTING_FILE_NETWORK_SECURITY"\s*=\s*)0*0\b/${1}01/' "$PREFS"
elif grep -Fq '["Main Pref Section v2"]' "$PREFS"; then
  # Keep whatever line ending the file already uses.
  perl -pi -e 'if (/^\["Main Pref Section v2"\](\r?\n)/) { my $eol = $1; $_ .= "\t\"Pref_SCRIPTING_FILE_NETWORK_SECURITY\" = 01$eol"; }' "$PREFS"
else
  echo "Could not find [\"Main Pref Section v2\"] in $PREFS (backup kept at $BACKUP)" >&2
  exit 1
fi

grep -Eq '"Pref_SCRIPTING_FILE_NETWORK_SECURITY"[[:space:]]*=[[:space:]]*01' "$PREFS" || { echo "Edit did not take; restoring backup." >&2; cp "$BACKUP" "$PREFS"; exit 1; }
echo "Enabled Pref_SCRIPTING_FILE_NETWORK_SECURITY in $PREFS. Start After Effects to apply."
