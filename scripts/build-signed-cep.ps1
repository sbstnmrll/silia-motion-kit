param(
  [string]$ZxpSignCmdPath = "C:\Users\User\silia-os\editorial\tools\zxp-signing\ZXPSignCmd.exe",
  [string]$CertificatePath = "",
  [string]$CertificatePassword = "",
  [string]$OutputPath = ""
)

# Builds artifacts/AeMcpCEP.zxp with a self-signed certificate. Not required on
# After Effects 2026 (the unsigned bundle loads with PlayerDebugMode), kept for
# future AE builds that may enforce signatures. Adapted from premiere-pro-mcp (MIT).

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $PSScriptRoot
$pluginSource = Join-Path $projectDir "cep-plugin"
$artifacts = Join-Path $projectDir "artifacts"
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null
if (-not $OutputPath) { $OutputPath = Join-Path $artifacts "AeMcpCEP.zxp" }

if (-not (Test-Path -LiteralPath $ZxpSignCmdPath)) {
  throw "ZXPSignCmd not found at $ZxpSignCmdPath (Adobe-CEP/CEP-Resources ships it)."
}

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
