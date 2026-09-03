param(
  [switch]$Diagnose,
  [switch]$Unsigned
)

# Installs the Silia AE MCP CEP bridge into the per-user CEP extensions folder and
# enables PlayerDebugMode (REG_SZ "1") so After Effects loads the unsigned bundle.
# Verified 2026-09-02: After Effects 2026 (26.3) loads the unsigned bundle with this
# key set; no ZXP signature needed. Adapted from premiere-pro-mcp (MIT).

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$pluginSource = Join-Path $projectDir "cep-plugin"
$signedPackage = Join-Path $projectDir "artifacts\AeMcpCEP.zxp"
$cepRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$destination = Join-Path $cepRoot "AeMcpCEP"
$resolvedRoot = [System.IO.Path]::GetFullPath($cepRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$resolvedDestination = [System.IO.Path]::GetFullPath($destination)

if (-not $resolvedDestination.StartsWith($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to install outside the CEP extensions directory: $resolvedDestination"
}

Write-Host "=== Silia AE MCP bridge ==="
Write-Host "Source:      $pluginSource"
Write-Host "Destination: $destination"
if ($Diagnose) { Write-Host "Mode:        check only (nothing is changed)" }

if (-not (Test-Path -LiteralPath (Join-Path $pluginSource "CSXS\manifest.xml"))) {
  throw "cep-plugin/CSXS/manifest.xml not found"
}

$aeRunning = Get-Process AfterFX -ErrorAction SilentlyContinue
if (-not $Diagnose -and $aeRunning) {
  Write-Warning "After Effects is running (pid $($aeRunning.Id -join ', ')). The new bundle loads on the next full restart of After Effects."
}

if (-not $Diagnose) {
  New-Item -ItemType Directory -Force -Path $cepRoot | Out-Null
  if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $resolvedDestination -Recurse -Force }

  if ((Test-Path -LiteralPath $signedPackage) -and -not $Unsigned) {
    $tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("AeMcpCEP-" + [guid]::NewGuid().ToString("N") + ".zip")
    try {
      Copy-Item -LiteralPath $signedPackage -Destination $tmpZip
      Expand-Archive -LiteralPath $tmpZip -DestinationPath $destination
      Write-Host "Installed signed package: $signedPackage"
    } finally {
      if (Test-Path -LiteralPath $tmpZip) { Remove-Item -LiteralPath $tmpZip -Force }
    }
  } else {
    Copy-Item -LiteralPath $pluginSource -Destination $destination -Recurse
    Write-Host "Installed development bundle (unsigned; PlayerDebugMode enabled)."
  }

  # CEP only honours PlayerDebugMode as a String value; a DWORD 1 is ignored.
  foreach ($v in 9..14) {
    $key = "HKCU:\SOFTWARE\Adobe\CSXS.$v"
    New-Item -Path $key -Force | Out-Null
    New-ItemProperty -Path $key -Name "PlayerDebugMode" -PropertyType String -Value "1" -Force | Out-Null
  }
}

$problems = @()
if (-not (Test-Path -LiteralPath (Join-Path $destination "CSXS\manifest.xml"))) {
  $problems += "Manifest missing from $destination (run ae-mcp --install-cep)"
}
foreach ($v in 11..14) {
  $key = "HKCU:\SOFTWARE\Adobe\CSXS.$v"
  $val = Get-ItemProperty -Path $key -Name "PlayerDebugMode" -ErrorAction SilentlyContinue
  if ($null -eq $val -or [string]$val.PlayerDebugMode -ne "1") { $problems += "CSXS.$v PlayerDebugMode missing or not 1"; continue }
  $kind = (Get-Item -Path $key).GetValueKind("PlayerDebugMode")
  if ($kind -ne [Microsoft.Win32.RegistryValueKind]::String) { $problems += "CSXS.$v PlayerDebugMode is $kind; must be REG_SZ" }
}

$logs = Get-ChildItem -Path $env:TEMP -Filter "CEP*-AEFT.log" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3
$sig = $logs | Select-String -Pattern "Signature verification failed for extension com\.silia\.ae\.mcp" -ErrorAction SilentlyContinue
if ($sig) { $problems += "After Effects rejected the bundle signature ($($sig[0].Path)). Run ae-mcp --sign-cep, then --install-cep." }
$loaded = $logs | Select-String -Pattern "PlugPlugLoadExtension ends for extension: com\.silia\.ae\.mcp\.(panel|headless) with return value: PlugPlugErrorCode_success" -ErrorAction SilentlyContinue
if ($loaded) { Write-Host "CEP log: bundle loaded successfully in a previous After Effects session ($($loaded[0].Path))." }

$bridgeRoot = if ($env:AE_MCP_TEMP_DIR) { $env:AE_MCP_TEMP_DIR } else { Join-Path $env:TEMP "ae-mcp-bridge" }
if (Test-Path $bridgeRoot) {
  Get-ChildItem $bridgeRoot -Directory | ForEach-Object {
    $pres = Get-ChildItem $_.FullName -Filter "presence_*.json" -ErrorAction SilentlyContinue | Where-Object { ((Get-Date) - $_.LastWriteTime).TotalSeconds -lt 15 }
    Write-Host "Bridge $($_.Name): $(@($pres).Count) live listener(s)"
  }
}

if ($problems.Count -gt 0) {
  Write-Host ""
  Write-Host "The AE MCP bridge needs attention:" -ForegroundColor Yellow
  $problems | ForEach-Object { Write-Host "  - $_" }
  Write-Host ""
  Write-Host "Next: fully quit After Effects, run the installer again, reopen After Effects."
  exit 1
}

Write-Host ""
if ($Diagnose) {
  Write-Host "Bridge installation looks ready. Open After Effects; the headless bridge starts automatically (Window > Extensions > Silia AE MCP shows the panel)."
} else {
  Write-Host "Installed. Fully restart After Effects. The bridge auto-starts; ask your assistant to run ae_status."
}
