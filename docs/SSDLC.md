# SSDLC — frontend (Vue / Nginx)

Planificación, análisis y diseño de seguridad de la SPA. Las herramientas **no van al CI**:
`scripts/seguridad` en este repo.

Activos, amenazas y controles compartidos con el backend están en
`Bolsa-de-Trabajo-backend/docs/SSDLC.md`.

## Activos de este repo

| Activo | Dónde | Impacto |
| --- | --- | --- |
| JWT en sessionStorage | stores de sesión | Suplantación si hay XSS |
| Formularios (cédula, BPS, CV) | vistas de registro / perfil | Datos personales |
| Cabeceras HTTP | `nginx.conf` | Clickjacking, MIME sniffing, CSP |

## Controles en el frontend

- Vue escapa HTML; no hay `v-html`.
- Términos y condiciones: ruta pública `/terminos`; el alta exige checkbox.
- Nginx: CSP, `X-Content-Type-Options`, `X-Frame-Options`, Permissions-Policy, HSTS en prod.

## Cómo correr las herramientas

Desde la raíz de **este** repo:

```powershell
.\scripts\seguridad\sast.ps1
.\scripts\seguridad\sca.ps1
.\scripts\seguridad\dast.ps1
```

Anotar en `scripts/seguridad/HALLAZGOS.md`.

**Pendiente de deploy:** `server_tokens off;` y recortar `img-src` en CSP.
