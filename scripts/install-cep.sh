#!/usr/bin/env bash
# macOS counterpart of install-cep.ps1.
#
# Installs the Silia AE MCP CEP bridge into the per-user CEP extensions folder and
# enables PlayerDebugMode (string "1") for CSXS 9..14.
# By default it installs the SIGNED package artifacts/AeMcpCEP.zxp (extracted with
# META-INF/signatures.xml + mimetype intact); the signature is cross-platform, so the
# .zxp built on Windows works here too. --unsigned copies the raw cep-plugin/ folder.
#
#   bash scripts/install-cep.sh              # install
#   bash scripts/install-cep.sh --unsigned   # dev bundle
#   bash scripts/install-cep.sh --diagnose   # check only, changes nothing
set -euo pipefail

DIAGNOSE=0
UNSIGNED=0
for a in "$@"; do
  case "$a" in
    --diagnose) DIAGNOSE=1 ;;
    --unsigned) UNSIGNED=1 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_SOURCE="$PROJECT_DIR/cep-plugin"
SIGNED_PACKAGE="$PROJECT_DIR/artifacts/AeMcpCEP.zxp"
CEP_ROOT="$HOME/Library/Application Support/Adobe/CEP/extensions"
DESTINATION="$CEP_ROOT/AeMcpCEP"
LOG_DIR="$HOME/Library/Logs/CSXS"

# Same guard as the .ps1: never touch anything outside the extensions folder.
case "$DESTINATION" in
  "$CEP_ROOT"/?*) ;;
  *) echo "Refusing to install outside the CEP extensions directory: $DESTINATION" >&2; exit 1 ;;
esac

echo "=== Silia AE MCP bridge ==="
echo "Source:      $PLUGIN_SOURCE"
echo "Destination: $DESTINATION"
[ "$DIAGNOSE" -eq 1 ] && echo "Mode:        check only (nothing is changed)"

[ -f "$PLUGIN_SOURCE/CSXS/manifest.xml" ] || { echo "cep-plugin/CSXS/manifest.xml not found" >&2; exit 1; }

AE_PIDS="$(pgrep -f 'Adobe After Effects 20[0-9][0-9]\.app/Contents/MacOS/After Effects' || true)"
if [ "$DIAGNOSE" -eq 0 ] && [ -n "$AE_PIDS" ]; then
  echo "WARNING: After Effects is running (pid $(echo $AE_PIDS)). The new bundle loads on the next full restart of After Effects."
fi

if [ "$DIAGNOSE" -eq 0 ]; then
  mkdir -p "$CEP_ROOT"
  rm -rf "$DESTINATION"
  if [ -f "$SIGNED_PACKAGE" ] && [ "$UNSIGNED" -eq 0 ]; then
    mkdir -p "$DESTINATION"
    unzip -q "$SIGNED_PACKAGE" -d "$DESTINATION"
    echo "Installed signed package: $SIGNED_PACKAGE"
  else
    cp -R "$PLUGIN_SOURCE" "$DESTINATION"
    echo "Installed development bundle (unsigned; PlayerDebugMode enabled)."
  fi
  # CEP only honours PlayerDebugMode as a string; an integer 1 is ignored.
  for v in 9 10 11 12 13 14; do
    defaults write "com.adobe.CSXS.$v" PlayerDebugMode -string 1
  done
fi

problems=()
[ -f "$DESTINATION/CSXS/manifest.xml" ] || problems+=("Manifest missing from $DESTINATION (run ae-mcp --install-cep)")
for v in 11 12 13 14; do
  val="$(defaults read "com.adobe.CSXS.$v" PlayerDebugMode 2>/dev/null || true)"
  type="$(defaults read-type "com.adobe.CSXS.$v" PlayerDebugMode 2>/dev/null || true)"
  if [ "$val" != "1" ]; then problems+=("CSXS.$v PlayerDebugMode missing or not 1"); continue; fi
  case "$type" in *string*) ;; *) problems+=("CSXS.$v PlayerDebugMode is '$type'; must be a string") ;; esac
done

if [ -d "$LOG_DIR" ]; then
  logs="$(ls -t "$LOG_DIR"/CEP*-AEFT.log 2>/dev/null | head -3 || true)"
  if [ -n "$logs" ]; then
    # shellcheck disable=SC2086
    if echo "$logs" | tr '\n' '\0' | xargs -0 grep -l "Signature verification failed for extension com\.silia\.ae\.mcp" >/dev/null 2>&1; then
      problems+=("After Effects rejected the bundle signature (see $LOG_DIR). The .zxp must be re-signed on Windows (ae-mcp --sign-cep), then --install-cep here.")
    fi
    if echo "$logs" | tr '\n' '\0' | xargs -0 grep -E -l "PlugPlugLoadExtension ends for extension: com\.silia\.ae\.mcp\.(panel|headless) with return value: PlugPlugErrorCode_success" >/dev/null 2>&1; then
      echo "CEP log: bundle loaded successfully in a previous After Effects session ($LOG_DIR)."
    fi
  fi
fi

BRIDGE_ROOT="${AE_MCP_TEMP_DIR:-$(node -e 'process.stdout.write(require("os").tmpdir())' 2>/dev/null || echo "${TMPDIR:-/tmp}")/ae-mcp-bridge}"
if [ -d "$BRIDGE_ROOT" ]; then
  for d in "$BRIDGE_ROOT"/*/; do
    [ -d "$d" ] || continue
    live="$(find "$d" -maxdepth 1 -name 'presence_*.json' -mtime -15s 2>/dev/null | wc -l | tr -d ' ')"
    echo "Bridge $(basename "$d"): $live live listener(s)"
  done
fi

if [ "${#problems[@]}" -gt 0 ]; then
  echo
  echo "The AE MCP bridge needs attention:"
  for p in "${problems[@]}"; do echo "  - $p"; done
  echo
  echo "Next: fully quit After Effects, run the installer again, reopen After Effects."
  exit 1
fi

echo
if [ "$DIAGNOSE" -eq 1 ]; then
  echo "Bridge installation looks ready. Open After Effects; the headless bridge starts automatically (Window > Extensions > Silia AE MCP shows the panel)."
else
  echo "Installed. Fully restart After Effects. The bridge auto-starts; ask your assistant to run ae_status."
fi
