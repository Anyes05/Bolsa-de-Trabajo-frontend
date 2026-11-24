#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
out="$here/out"
mkdir -p "$out"

command -v node >/dev/null || { echo "Hace falta Node.js"; exit 1; }

cd "$here"
if [[ ! -d node_modules/eslint ]]; then
  echo "Instalando ESLint + plugin de seguridad (solo local, no CI)..."
  npm install --no-fund --no-audit
fi

echo "SAST frontend (ESLint security)..."
(cd "$repo" && node "$here/node_modules/eslint/bin/eslint.js" \
  --config "$here/eslint.sast.config.mjs" --no-error-on-unmatched-pattern \
  -f json -o "$out/sast-eslint.json" "src")
echo "ESLint listo: $out/sast-eslint.json"
echo "SAST frontend listo. Anotá en scripts/seguridad/HALLAZGOS.md"
