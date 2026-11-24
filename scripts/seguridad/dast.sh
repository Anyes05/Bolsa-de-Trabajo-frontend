#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
url="${1:-https://ccisj.cloud-ip.cc}"
out="$here/out"
mkdir -p "$out"
command -v docker >/dev/null || { echo "Instalá Docker para OWASP ZAP"; exit 1; }
echo "DAST OWASP ZAP baseline contra $url"
docker run --rm -v "$out:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$url" -I -J dast-zap.json -w dast-zap.md -r dast-zap.html \
  | tee "$out/dast-zap.log"
echo "DAST listo. Anotá hallazgos en scripts/seguridad/HALLAZGOS.md"
