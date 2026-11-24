$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = Split-Path -Parent (Split-Path -Parent $here)
$out = Join-Path $here "out"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Invoke-AllowAuditExit([scriptblock]$Block) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $Block
  $ErrorActionPreference = $prev
}

if (Get-Command trivy -ErrorAction SilentlyContinue) {
  Write-Host "SCA Trivy (frontend)..."
  trivy fs --scanners vuln,secret --format table $repo
  trivy fs --format json -o (Join-Path $out "sca-trivy.json") $repo
  Write-Host "Trivy listo: $out\sca-trivy.json"
} else {
  Write-Host "Trivy no está en PATH; SCA con npm audit."
}

$npmJson = Join-Path $out "sca-npm.json"
Write-Host "SCA frontend (npm audit)..."
Push-Location $repo
try {
  Invoke-AllowAuditExit { npm audit --json 2>$null | Out-File -FilePath $npmJson -Encoding utf8 }
} finally {
  Pop-Location
}
Write-Host "npm audit listo: $npmJson"
Write-Host "SCA frontend listo. Anotá en scripts/seguridad/HALLAZGOS.md"
