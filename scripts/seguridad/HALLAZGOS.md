# Hallazgos SAST / SCA / DAST — frontend

Corrida local del **2026-11-23, ~22:45 (America/Montevideo)**. DAST repetido a las 23:07. Correcciones de la misma noche, más abajo. No entra al CI.
Backend (PMD + OSV + Trivy del `pom`): `Bolsa-de-Trabajo-backend/scripts/seguridad/HALLAZGOS.md`.

## Qué se ejecutó

Desde la raíz de este repo:

```powershell
.\scripts\seguridad\sast.ps1
.\scripts\seguridad\sca.ps1
.\scripts\seguridad\dast.ps1
```

| Escaneo | Herramienta | Versión | Alcance | Resultado de la corrida |
| --- | --- | --- | --- | --- |
| SAST | ESLint + `eslint-plugin-security` (reglas recommended) | ESLint 9.39.5, Node v22.23.2 | `src/**/*.{js,mjs,cjs,ts,vue}` — **189 archivos** | Terminó. 32 warnings, 0 errors. |
| SCA | `npm audit --json` | npm 10.9.8 | `package-lock.json`, **incluye devDependencies** | Terminó. 25 avisos. |
| SCA | Trivy `fs` scanners `vuln` + `secret` | **0.76.2** (instalado en esta corrida con winget) | Lockfile npm. Trivy **oculta** deps de desarrollo salvo `--include-dev-deps` | Terminó. 27 CVE en deps que Trivy trata como prod. **0 secretos.** |
| DAST | OWASP ZAP baseline (`zap-baseline.py`, imagen `ghcr.io/zaproxy/zaproxy:stable`) | Docker Desktop 29.8.2 | `https://ccisj.cloud-ip.cc`, sin login. Reintento **2026-11-23 23:07** | Terminó. **0 FAIL, 10 WARN, 58 PASS.** 6 URLs públicas. |

No se usó Semgrep ni Python. El SAST de este repo es ESLint. OSS Index no se usa (pide cuenta). Los JSON crudos quedan en `scripts/seguridad/out/` y no se versionan.

A las 22:45 el contenedor no pudo abrir el puerto 443 (dos timeouts). A las 23:07, con el servidor prendido, el mismo baseline sí recorrió el sitio. SAST y SCA no se repitieron.

## Resumen

| Frente | Hallazgo | Veredicto |
| --- | --- | --- |
| ESLint security | 32 warnings: object-injection 15, timing 14, regex 3 | Ruido del plugin. Sin `eval`, `innerHTML` ni `v-html`. |
| npm audit | 2 critical, 4 high, 18 moderate, 1 low | Los critical son Vitest (tests). Vue/Vite high aplican a dev server o SSR, que esta SPA no usa. |
| Trivy | 0 critical, 4 high, 15 medium, 8 low; 0 secretos | Misma familia que npm, contada por CVE y sin el árbol de test. |
| ZAP | 0 FAIL, 10 WARN, 58 PASS | El único high es `Server: nginx/1.30.4`. CSP `img-src https:` y `style-src 'unsafe-inline'`. |

## SAST — ESLint security

Config: `scripts/seguridad/eslint.sast.config.mjs`. Parser de Vue + TypeScript. Salida: `out/sast-eslint.json`.

| Regla | Cant. | Dónde | Qué marcó | Veredicto |
| --- | --- | --- | --- | --- |
| `security/detect-possible-timing-attacks` | 14 | `stores/postulanteNotifications.ts` (8), `stores/socioNotifications.ts` (6) | Comparaciones `===` de booleanos y del token de sesión en la UI | **Falso positivo.** No es comparación de HMAC ni de clave. |
| `security/detect-object-injection` | 15 | `composables/useTheme.ts:22`, `utils/camposFicticios.ts:20`, vistas de registro, perfiles, directorio, ofertas y varios `*.spec.ts` | `objeto[clave]` sobre mapas fijos o mocks | **Falso positivo.** En `useTheme.ts` la clave es `'light' \| 'dark'`. |
| `security/detect-unsafe-regex` | 3 | `utils/moneyAmount.ts:2`, `AdminDashboardView.vue:332`, `AdminSettingsView.vue:38` | Montos: `/^\d{1,12}(?:\.\d{1,2})?$/` y `/^\d+(\.\d{1,2})?$/` | **Aceptado.** Cuantificadores acotados o input corto de admin. `moneyAmount.ts` ya lo documenta. |

Respecto de la corrida de la mañana del mismo día (175 archivos, 30 warnings): el árbol creció y aparecieron `useTheme.ts` y `moneyAmount.ts`. No hay hallazgos nuevos de inyección real.

## SCA — npm audit

Salida: `out/sca-npm.json`. Cuenta **avisos** (un paquete puede agrupar varios CVE). Incluye el árbol de desarrollo.

| Paquete | Sev. | ¿Directo? | ¿En el bundle de prod? | Veredicto |
| --- | --- | --- | --- | --- |
| `vitest` | critical | Sí (dev) | No | Runner de tests. Vitest 5 es major. |
| `tinypool` | critical | No | No | Dependencia de Vitest. |
| `vue` | high | Sí | Sí | El aviso high está en `@vue/server-renderer`. Esta app es SPA, no SSR. Parche menor: Vue 3.5.46. |
| `@vue/server-renderer` | high | No | No se ejecuta | XSS del renderer de servidor. |
| `vite` 6.0.5 | high | Sí | Solo build / `npm run dev` | Bypass de `server.fs.deny` y bugs del dev server. Parche de la línea 6: 6.4.6. En `package.json` está en `dependencies`, por eso Trivy también lo ve. |
| `source-map-js` | high | No | Build | DoS al parsear source maps. |
| `exceljs` | moderate | Sí | Sí (export Excel) | Arrastra `uuid` (bounds de v3/v5). exceljs 4.x no tiene parche menor. |
| `uuid` | moderate | No | Vía exceljs | Aceptado con el de arriba. |
| `@vitest/coverage-v8`, `@vitest/mocker`, `test-exclude` | moderate | Cobertura sí | No | Toolchain de test. |
| `typescript-eslint` y paquetes `@typescript-eslint/*` | moderate | El meta-paquete sí | No | ReDoS del linter. |
| `esbuild`, `glob`, `minimatch`, `vue-tsc`, `@vue/language-core`, `editorconfig`, `js-beautify` | moderate | No | No | Build o lint. |
| `dompurify` | low | No (vía jspdf) | Posible | XSS en hooks de sanitizado. Bajo. |

## SCA — Trivy

Comando del script: `trivy fs --scanners vuln,secret` sobre este repo, más un JSON en `out/sca-trivy.json`.
Base de vulnerabilidades descargada en la corrida (`trivy-db`). Secretos: **0**.

Sobre `package-lock.json`, con devDependencies ocultas: **27** (LOW 8, MEDIUM 15, HIGH 4, CRITICAL 0).

| Paquete | Sev. más alta | Lectura |
| --- | --- | --- |
| `vite@6.0.5` | HIGH | Varios CVE del dev server (`server.fs.deny`, path traversal en Windows, `launch-editor`). No están en el Nginx de producción. |
| `@vue/server-renderer@3.5.13` | HIGH | GHSA-g2v6-rqmx-r4w6. Sin SSR. |
| `source-map-js@1.2.1` | HIGH | CVE-2026-93749. Toolchain. |
| `esbuild@0.24.0` | MEDIUM | GHSA-67mh-4wv8-2f99. Dev server. |
| `uuid@8.3.2` | MEDIUM | CVE-2026-41907. Vía exceljs. |
| `dompurify@3.4.15` | LOW | Varios GHSA de hooks `IN_PLACE` / plantillas. |

Los 2 critical de `npm audit` no salen acá porque Trivy los clasifica como desarrollo.

## DAST — OWASP ZAP

Target: **https://ccisj.cloud-ip.cc**. Baseline sin autenticación. El spider vio 6 URLs (HTML, JS, CSS, `robots.txt`, `sitemap.xml`). No entra a `/admin`, `/socio` ni a la API con sesión.

Contadores del script: **FAIL-NEW 0, WARN-NEW 10, PASS 58**. El JSON parte algunos plugins en más de una alerta (13 registros). Reportes: `out/dast-zap.json`, `dast-zap.md`, `dast-zap.html`, `dast-zap.log`. Hora: 2026-11-24 02:07 UTC (23:07 en Montevideo).

| Alerta | Riesgo ZAP | Qué vio | Veredicto |
| --- | --- | --- | --- |
| nginx Version with Known Vulnerabilities | High | `Server: nginx/1.30.4` en `robots.txt` | **Acción:** `server_tokens off;` y valorar upgrade de la imagen. Un parche de distro puede no cambiar el número. |
| CSP: Wildcard Directive | Medium | `img-src 'self' data: https:` | Recortar a `'self' data:` y el origen de Google Fonts si hace falta. |
| CSP: style-src unsafe-inline | Medium | `style-src 'self' 'unsafe-inline'` | Típico de Vue sin nonce. Aceptable. |
| SRI Attribute Missing | Medium | `<link href="https://fonts.googleapis.com/css2?...">` sin `integrity` | El JS propio es `'self'`. El aviso concreto es la hoja de Google Fonts. |
| Server version leak | Low | El mismo `nginx/1.30.4` en HTML, JS, CSS, robots y sitemap | Sale con `server_tokens off`. |
| COEP / COOP / CORP missing | Low | Aislamiento entre orígenes | No hace falta en esta SPA. |
| Unix Timestamp Disclosure | Low | `1502002290` dentro de `index-D8tLoBSb.js` | **Falso positivo.** Número del bundle, no un secreto. |
| Cache-control / Storable | Info | HTML, CSS y sitemap cacheables | Normal para estáticos. |
| Suspicious comments | Info | Comentario en el JS minificado (`Myers`) | Info, no secreto. |
| Modern Web Application | Info | `<script type="module" src="/assets/index-D8tLoBSb.js">` | El spider no entra al router de Vue. |

Cabeceras que sí están (por eso esos plugins salen PASS): HSTS, CSP presente, `X-Frame-Options`, `X-Content-Type-Options`, Permissions-Policy.

Los dos intentos de las 22:46 y 22:48 (timeout al puerto 443) quedan reemplazados por este baseline.

## Correcciones aplicadas (23/11, después de la corrida)

| Hallazgo | Qué se hizo |
| --- | --- |
| `Server` de Nginx en la imagen del frontend | `server_tokens off;` en `nginx.conf`. El `nginx/1.30.4` que vio ZAP es el Nginx del servidor, que no está en este repo: no cambia hasta el próximo deploy y, si el header lo pone ese proxy, hay que apagarlo ahí. |
| Vue 3.5.13 / Vite 6.0.5 (high) y Vitest/tinypool (critical, solo tests) | Vue **3.5.46**, Vite **6.4.6**, Vitest **5.1.1** y `@vitest/coverage-v8` **5.1.1**. `npm test`: 639 pruebas ok. `npm run build` ok. |
| Google Fonts sin `integrity` | Inter 400–800 se sirve desde el sitio (`@fontsource/inter`). Se quitó el `<link>` a fonts.googleapis.com. |
| `img-src https:` | Se deja. Las fotos de Google y S3 son URL https. |
| `style-src 'unsafe-inline'` | Se deja. Es el estilo de Vue. |
| Avisos ESLint (32) | No se tocaron: son falsos positivos del plugin. |
| npm audit que queda | 15 avisos: 0 critical, 0 high, 14 moderate, 1 low. Son toolchain (`typescript-eslint`, `vue-tsc`, `glob`) y `exceljs`/`uuid`/`dompurify`. Sin parche menor que no cambie de major. |

Spring Boot 3.3.3 queda **pendiente** de hablarlo con el equipo. No se subió.

## Notas

- Trivy 0.76.2 no estaba instalado; se bajó con winget (`AquaSecurity.Trivy`) para esta corrida.
- El DAST de las 23:07 usó Docker Desktop 29.8.2 y la imagen `ghcr.io/zaproxy/zaproxy:stable`. Bundle publicado: `index-D8tLoBSb.js` y `index-mjqwkVkc.css`.
- ESLint de seguridad vive en `scripts/seguridad/` (119 paquetes locales). No se agregó al `package.json` de la app ni al workflow.
- No se subieron versiones de Vue, Vite ni dependencias.
