#!/usr/bin/env bash
set -u
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
out="$here/out"
mkdir -p "$out"

if command -v trivy >/dev/null; then
  echo "SCA Trivy (frontend)..."
  trivy fs --scanners vuln,secret --format table "$repo"
  trivy fs --format json -o "$out/sca-trivy.json" "$repo"
else
  echo "Trivy no está en PATH; SCA con npm audit."
fi

echo "SCA frontend (npm audit)..."
(cd "$repo" && npm audit --json > "$out/sca-npm.json" || true)
echo "npm audit listo: $out/sca-npm.json"
echo "SCA frontend listo. Anotá en scripts/seguridad/HALLAZGOS.md"
