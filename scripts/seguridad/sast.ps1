$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = Split-Path -Parent (Split-Path -Parent $here)
$out = Join-Path $here "out"
New-Item -ItemType Directory -Force -Path $out | Out-Null

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Hace falta Node.js (runtime del frontend)."
  exit 1
}

Push-Location $here
try {
  if (-not (Test-Path "node_modules\eslint")) {
    Write-Host "Instalando ESLint + plugin de seguridad (solo local, no CI)..."
    npm install --no-fund --no-audit
  }

  $eslintJson = Join-Path $out "sast-eslint.json"
  Write-Host "SAST frontend (ESLint security)..."
  $eslintBin = Join-Path $here "node_modules\eslint\bin\eslint.js"
  $config = Join-Path $here "eslint.sast.config.mjs"
  Push-Location $repo
  try {
    & node $eslintBin --config $config --no-error-on-unmatched-pattern -f json -o $eslintJson "src"
  } finally {
    Pop-Location
  }
  if ($LASTEXITCODE -gt 1) {
    throw "ESLint falló con código $LASTEXITCODE"
  }
  Write-Host "ESLint listo: $eslintJson"
} finally {
  Pop-Location
}

Write-Host "SAST frontend listo. Anotá en scripts/seguridad/HALLAZGOS.md"
