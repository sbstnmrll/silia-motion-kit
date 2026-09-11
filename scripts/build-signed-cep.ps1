param(
  [string]$ZxpSignCmdPath = "",
  [string]$CertificatePath = "",
  [string]$CertificatePassword = "",
  [string]$OutputPath = ""
)

# Builds artifacts/AeMcpCEP.zxp with a self-signed certificate.
# REQUIRED on After Effects 2026: since 2026-09-08 AE rejects the unsigned bundle
# ("Signature verification failed" in %TEMP%\CEP12-AEFT.log) even with PlayerDebugMode
# set. The repo ships a ready-made artifacts/AeMcpCEP.zxp, so you only need this script
# if you CHANGED cep-plugin/ and have to re-sign it.
# Adapted from premiere-pro-mcp (MIT).

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $PSScriptRoot
$pluginSource = Join-Path $projectDir "cep-plugin"
$artifacts = Join-Path $projectDir "artifacts"
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null
if (-not $OutputPath) { $OutputPath = Join-Path $artifacts "AeMcpCEP.zxp" }

if (-not $ZxpSignCmdPath) {
  # 1) $env:ZXPSIGNCMD  2) tools\ inside this repo  3) PATH  4) the Silia editorial checkout
  $probe = @()
  if ($env:ZXPSIGNCMD) { $probe += $env:ZXPSIGNCMD }
  $probe += (Join-Path $projectDir "tools\ZXPSignCmd.exe")
  $onPath = Get-Command ZXPSignCmd.exe -ErrorAction SilentlyContinue
  if ($onPath) { $probe += $onPath.Source }
  $probe += (Join-Path (Split-Path -Parent (Split-Path -Parent $projectDir)) "tools\zxp-signing\ZXPSignCmd.exe")
  foreach ($p in $probe) {
    if ($p -and (Test-Path -LiteralPath $p)) { $ZxpSignCmdPath = $p; break }
  }
}

if (-not $ZxpSignCmdPath -or -not (Test-Path -LiteralPath $ZxpSignCmdPath)) {
  throw "ZXPSignCmd.exe not found. Download it from https://github.com/Adobe-CEP/CEP-Resources (folder ZXPSignCMD), put it in $projectDir\tools\, set `$env:ZXPSIGNCMD, or pass -ZxpSignCmdPath."
}
Write-Host "Signing with: $ZxpSignCmdPath"

if (-not $CertificatePath) {
  $CertificatePath = Join-Path $artifacts "ae-mcp-selfsigned.p12"
  $envFile = Join-Path $projectDir ".env.local"
  if (-not $CertificatePassword) {
    if (Test-Path $envFile) {
      $line = Get-Content $envFile | Where-Object { $_ -match "^AE_MCP_CERT_PASSWORD=" } | Select-Object -First 1
      if ($line) { $CertificatePassword = $line.Substring("AE_MCP_CERT_PASSWORD=".Length) }
    }
    if (-not $CertificatePassword) {
      $CertificatePassword = [guid]::NewGuid().ToString("N")
      Add-Content -Path $envFile -Value "AE_MCP_CERT_PASSWORD=$CertificatePassword"
      Write-Host "Generated a certificate password and stored it in .env.local (git-ignored)."
    }
  }
  if (-not (Test-Path -LiteralPath $CertificatePath)) {
    & $ZxpSignCmdPath -selfSignedCert MX CDMX "Silia" "Silia AE MCP" $CertificatePassword $CertificatePath
    if ($LASTEXITCODE -ne 0) { throw "ZXPSignCmd failed to create the certificate." }
  }
}

if (Test-Path -LiteralPath $OutputPath) { Remove-Item -LiteralPath $OutputPath -Force }
& $ZxpSignCmdPath -sign $pluginSource $OutputPath $CertificatePath $CertificatePassword
if ($LASTEXITCODE -ne 0) { throw "ZXPSignCmd failed to sign $pluginSource" }
& $ZxpSignCmdPath -verify $OutputPath
if ($LASTEXITCODE -ne 0) { throw "ZXPSignCmd could not verify $OutputPath" }
Write-Host "Signed package: $OutputPath"
Write-Host "Next: node dist/index.js --install-cep   (After Effects fully closed)"
