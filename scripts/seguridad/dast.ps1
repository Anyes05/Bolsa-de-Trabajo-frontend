$ErrorActionPreference = "Stop"
$url = if ($args[0]) { $args[0] } else { "https://ccisj.cloud-ip.cc" }
$out = Join-Path $PSScriptRoot "out"
New-Item -ItemType Directory -Force -Path $out | Out-Null
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Instalá Docker para correr OWASP ZAP baseline."
  exit 1
}
$log = Join-Path $out "dast-zap.log"
Write-Host "DAST OWASP ZAP baseline contra $url"
$wrk = ($out -replace '\\', '/')
docker run --rm -v "${wrk}:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable `
  zap-baseline.py -t $url -I -J dast-zap.json -w dast-zap.md -r dast-zap.html `
  | Tee-Object -FilePath $log
Write-Host "DAST listo. Log: $log. Anotá hallazgos en scripts/seguridad/HALLAZGOS.md"
