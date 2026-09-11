<#
  Silia AE MCP — instalación completa en una pasada.

  Uso (PowerShell, con After Effects CERRADO):
      powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

  Hace: comprueba Node y ffmpeg -> npm ci -> npm run build -> instala el puente CEP
  (paquete firmado) -> --doctor -> imprime el comando para registrar el MCP.
  No toca After Effects ni registra nada en Claude por su cuenta.
#>
param(
  [switch]$SkipInstall,   # salta npm ci (si ya están las dependencias)
  [switch]$SkipCep        # salta la instalación del puente CEP
)

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $PSScriptRoot
Push-Location $projectDir
$warnings = @()

function Step($n, $text) { Write-Host ""; Write-Host "[$n] $text" -ForegroundColor Cyan }

try {
  Write-Host "=== Silia AE MCP — setup ===" -ForegroundColor Cyan
  Write-Host "Repo: $projectDir"

  Step 1 "Node.js >= 20.19"
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) { throw "Node.js no está instalado o no está en PATH. Instálalo desde https://nodejs.org (LTS) y vuelve a correr este script." }
  $nodeVersion = (& node -v).TrimStart('v')
  $parsed = [version]($nodeVersion -replace '-.*$', '')
  if ($parsed -lt [version]"20.19.0") { throw "Node $nodeVersion es demasiado viejo; hace falta 20.19 o superior." }
  Write-Host "    node $nodeVersion  ($($nodeCmd.Source))"

  Step 2 "ffmpeg / ffprobe (verificación de renders y análisis de audio)"
  foreach ($exe in @("ffmpeg", "ffprobe")) {
    if (Get-Command $exe -ErrorAction SilentlyContinue) { Write-Host "    $exe OK" }
    else { $warnings += "$exe no está en PATH: los renders se harán igual, pero sin verificación (duración, fps, alpha). Instálalo con: winget install Gyan.FFmpeg" }
  }

  Step 3 "After Effects"
  $aeRoots = Get-ChildItem "C:\Program Files\Adobe" -Directory -Filter "Adobe After Effects*" -ErrorAction SilentlyContinue
  if (-not $aeRoots) { $warnings += "No se encontró After Effects en C:\Program Files\Adobe. El puente no tendrá a quién hablarle." }
  else { $aeRoots | ForEach-Object { Write-Host "    $($_.Name)" } }
  $aeRunning = Get-Process AfterFX -ErrorAction SilentlyContinue
  if ($aeRunning) { $warnings += "After Effects está abierto. El puente nuevo sólo carga tras cerrarlo del todo y volver a abrirlo." }

  if (-not $SkipInstall) {
    Step 4 "npm ci (dependencias)"
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci falló." }
  } else { Step 4 "npm ci — saltado (-SkipInstall)" }

  Step 5 "npm run build (TypeScript -> dist/)"
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "El build falló." }
  $entry = Join-Path $projectDir "dist\index.js"
  if (-not (Test-Path -LiteralPath $entry)) { throw "El build terminó pero no existe dist\index.js." }

  if (-not $SkipCep) {
    Step 6 "Puente CEP dentro de After Effects"
    & node $entry --install-cep
    if ($LASTEXITCODE -ne 0) { throw "--install-cep falló; mira la salida de arriba." }
  } else { Step 6 "Puente CEP — saltado (-SkipCep)" }

  Step 7 "Diagnóstico (--doctor)"
  & node $entry --doctor
  $doctorExit = $LASTEXITCODE
  if ($doctorExit -ne 0) { $warnings += "--doctor encontró problemas (lista arriba). Con After Effects cerrado es normal que no haya 'listeners'; el resto no debería tener quejas." }

  Step 8 "Registrar el MCP en Claude"
  $nodeExe = $nodeCmd.Source
  Write-Host ""
  Write-Host "  Claude Code (una vez, ámbito usuario):" -ForegroundColor Green
  Write-Host "    claude mcp add ae -s user -e AE_MCP_TARGET=auto -- `"$nodeExe`" `"$entry`""
  Write-Host ""
  Write-Host "  Claude Desktop: pega el JSON que imprime este comando en %APPDATA%\Claude\claude_desktop_config.json" -ForegroundColor Green
  Write-Host "    node `"$entry`" --print-mcp-config"

  Write-Host ""
  if ($warnings.Count) {
    Write-Host "Avisos:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
  }
  Write-Host "Listo. Ahora: 1) registra el MCP con el comando de arriba  2) abre After Effects  3) pide a Claude que corra ae_status." -ForegroundColor Cyan
}
finally {
  Pop-Location
}
