# Seguridad local del frontend (no CI)

SAST, SCA y DAST se corren **en esta máquina**, no en GitHub Actions.

Este repo cubre Vue/TS, `package.json` y el Nginx de la SPA. El backend tiene los mismos
scripts en `Bolsa-de-Trabajo-backend/scripts/seguridad` (PMD + OSV.dev).

## Prerrequisitos

- Node.js 20+
- Docker (solo DAST: imagen `ghcr.io/zaproxy/zaproxy:stable`)
- Trivy es opcional

## Comandos (desde la raíz de este repo)

```powershell
.\scripts\seguridad\sast.ps1
.\scripts\seguridad\sca.ps1
.\scripts\seguridad\dast.ps1   # por defecto https://ccisj.cloud-ip.cc
```

Git Bash:

```bash
bash scripts/seguridad/sast.sh
bash scripts/seguridad/sca.sh
bash scripts/seguridad/dast.sh https://ccisj.cloud-ip.cc
```

JSON/XML de cada corrida van a `scripts/seguridad/out/` (ignorado). El resumen para el
docente va en `HALLAZGOS.md`.
