#!/usr/bin/env bash
# macOS counterpart of uninstall-cep.ps1.
set -euo pipefail
CEP_ROOT="$HOME/Library/Application Support/Adobe/CEP/extensions"
DESTINATION="$CEP_ROOT/AeMcpCEP"
case "$DESTINATION" in
  "$CEP_ROOT"/?*) ;;
  *) echo "Refusing to remove outside the CEP extensions directory" >&2; exit 1 ;;
esac
if [ -d "$DESTINATION" ]; then
  rm -rf "$DESTINATION"
  echo "Removed $DESTINATION"
else
  echo "Nothing to remove at $DESTINATION"
fi
echo "PlayerDebugMode defaults were left untouched (other CEP extensions may rely on them)."
