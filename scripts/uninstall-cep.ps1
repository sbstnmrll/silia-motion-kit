$ErrorActionPreference = "Stop"
$cepRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$destination = Join-Path $cepRoot "AeMcpCEP"
$resolvedRoot = [System.IO.Path]::GetFullPath($cepRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$resolvedDestination = [System.IO.Path]::GetFullPath($destination)
if (-not $resolvedDestination.StartsWith($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove outside the CEP extensions directory"
}
if (Test-Path -LiteralPath $destination) {
  Remove-Item -LiteralPath $resolvedDestination -Recurse -Force
  Write-Host "Removed $destination"
} else {
  Write-Host "Nothing to remove at $destination"
}
Write-Host "Registry PlayerDebugMode keys were left untouched (other CEP extensions may rely on them)."
