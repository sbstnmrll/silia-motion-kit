param(
  [Parameter(Mandatory = $true)][string]$Version
)

# Turns on Edit > Preferences > Scripting & Expressions > "Allow Scripts to Write
# Files and Access Network" for one After Effects version by editing its prefs file.
# Needed only by the headless poller transport (the CEP bridge writes files from Node).
# After Effects must be closed: it rewrites the prefs file on quit.

$ErrorActionPreference = "Stop"
if (Get-Process AfterFX -ErrorAction SilentlyContinue) {
  throw "After Effects is running. Quit it first (it overwrites the prefs file on exit)."
}

$prefsDir = Join-Path $env:APPDATA "Adobe\After Effects\$Version"
$prefs = Join-Path $prefsDir "Adobe After Effects $Version Prefs-indep-general.txt"
if (-not (Test-Path -LiteralPath $prefs)) {
  $candidates = Get-ChildItem (Join-Path $env:APPDATA "Adobe\After Effects") -Directory | Select-Object -ExpandProperty Name
  throw "Prefs file not found: $prefs. Installed versions: $($candidates -join ', ')"
}

$backup = "$prefs.bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Copy-Item -LiteralPath $prefs -Destination $backup
Write-Host "Backup: $backup"

$content = Get-Content -LiteralPath $prefs -Raw
if ($content -match '"Pref_SCRIPTING_FILE_NETWORK_SECURITY"\s*=\s*0*1\b') {
  Write-Host "Already enabled."
  exit 0
}
if ($content -match '"Pref_SCRIPTING_FILE_NETWORK_SECURITY"\s*=\s*0*0\b') {
  $content = $content -replace '("Pref_SCRIPTING_FILE_NETWORK_SECURITY"\s*=\s*)0*0\b', '${1}01'
} elseif ($content -match '\["Main Pref Section v2"\]') {
  $content = $content -replace '(\["Main Pref Section v2"\]\r?\n)', ('$1' + "`t`"Pref_SCRIPTING_FILE_NETWORK_SECURITY`" = 01`r`n")
} else {
  throw "Could not find [""Main Pref Section v2""] in $prefs"
}
[System.IO.File]::WriteAllText($prefs, $content, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Enabled Pref_SCRIPTING_FILE_NETWORK_SECURITY in $prefs. Start After Effects to apply."
