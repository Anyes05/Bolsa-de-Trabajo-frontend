# Testing del frontend — Proyecto final CCISJ

Fecha de referencia: 11/11/2026.

## Cobertura Vitest

El frontend genera cobertura V8 durante `npm run test:coverage` y en
`npm run test:ci`. El reporte incluye los archivos TypeScript y Vue de `src`;
solo se excluyen las propias pruebas y la declaración ambiental de Vite. No se
excluyen vistas, componentes o servicios para aumentar artificialmente el
porcentaje.

CI publica el artifact `frontend-vitest-coverage`, que contiene HTML, LCOV,
resumen JSON y Cobertura XML. Para navegar el reporte visual hay que descargar
y extraer el artifact completo, y luego abrir `index.html`.

Vitest solo mide el código ejecutado por sus pruebas. Las pruebas separadas de
Node y Playwright siguen aportando evidencia funcional, pero sus ejecuciones no
se suman al porcentaje de Vitest. No se promedian los porcentajes de frontend y
backend ni se interpreta cobertura como cumplimiento automático de requisitos.

Primera medición verificada en
[CI del PR de cobertura](https://github.com/Anyes05/Bolsa-de-Trabajo-frontend/actions/runs/44941353543)
el 21/11/2026: tests, build y Playwright aprobados. Vitest informó **173 de
9220 líneas (1,87%)**, **24 de 127 funciones (18,89%)** y **73 de 162 ramas
(45,06%)**. El bajo porcentaje de líneas refleja que el reporte incluye todas
las vistas y componentes Vue, aunque todavía no tengan pruebas Vitest. Esta es
la base real para priorizar flujos; no se corrige excluyendo archivos.

 en `package.json`, conservando tanto ESLint como Playwright y todos los scripts de testing; lockfile sincronizado con npm. Una repetición de un workflow sobre el commit anterior no incorpora esta corrección: debe ejecutarse sobre el commit que la publique.

### Medición local ampliada (21/11/2026)

`npm run test:ci` aprobado: **51 pruebas Vitest**, **27 pruebas Node**,
sin fallos ni omisiones, y build TypeScript/Vite exitoso.
V8 informa **618 de 11800 líneas (5,23%)**, **49 de 165 funciones (29,69%)**
y **255 de 366 ramas (69,67%)**. El reporte conserva todo el alcance de `src`;
las vistas y componentes siguen sin ejecución Vitest en este lote.

Nuevas pruebas de [sesión](src/stores/auth.spec.ts) y
[notificaciones](src/stores/notifications.spec.ts): restauración por rol,
persistencia, contraseña provisional, deduplicación de solicitudes, respuestas
tardías tras cambiar sesión, fotos concurrentes, lectura de avisos, nuevos
avisos durante lectura masiva, popup bloqueante y recuperación de errores.
Cobertura de líneas: sesión **97%**, notificaciones de postulante **100%** y
notificaciones de socio **98,76%**. Los mocks verifican comportamiento local,
no integración real con backend. Las ramas globales no sustituyen el bajo
porcentaje de líneas: todavía falta cubrir la interfaz Vue.

## Ubicación y alcance

El [plan principal de testing está en backend](https://github.com/Anyes05/Bolsa-de-Trabajo-backend/blob/master/testing.md): contiene la pirámide, fases, integración/API, PostgreSQL, GreenMail, matriz E2E, UAT y criterios de cierre.

Este documento concentra las tareas del frontend. Se recomienda mantener ambos archivos, con un único plan principal para evitar versiones contradictorias. Los enlaces entre repositorios estarán disponibles en GitHub cuando se publiquen estos documentos.

Las casillas indican trabajo pendiente de cierre con evidencia, no ausencia necesariamente de implementación.

## Alcance contrastado con RF/RNF

La matriz completa RF-01 a RF-24 y RNF-01 a RNF-07 se mantiene en el plan principal. Revisión de fuentes del frontend `49cb966` y backend `fbfbff5`; no certifica el estado del despliegue.

| Requisito | Función que sí existe y se puede probar | Brecha / decisión que no debe confundirse con testing pendiente |
|---|---|---|
| RF-02 | Monto/medio de cobro y reintegros puntuales/recurrentes en [Caja](src/views/admin/AdminDashboardView.vue). | No hay selector de fecha del cobro; backend usa la fecha actual. |
| RF-03 / RF-11 | [Filtros de Caja](src/utils/cajaFilters.ts), acceso con socio activo a Bolsa y postulación por perfil. | Al día no implica necesariamente saldo cero; moroso activo no está bloqueado de Bolsa. Resolver expectativas antes de exigir otra política. |
| RF-06 | [Importación Excel](src/views/admin/AdminImportacionView.vue) y exportaciones con selección/fechas en el modal. | No hay CSV. Abrir el modal de exportación reinicia sus filtros y no hereda automáticamente los del listado. |
| RF-09 | [Perfiles y CV manual/archivo](src/views/postulante/PostulantePerfilesView.vue), un CV máximo por perfil. | El perfil admite hasta 4 rubros; no es exactamente un rubro ni rubros ilimitados por perfil. |
| RF-18 | [ADMIN](src/views/admin/AdminPerfilView.vue): foto/contraseña. [SOCIO](src/views/socio/SocioPerfilView.vue): datos, contacto y contraseña. [POSTULANTE](src/views/postulante/PostulanteMiPerfilView.vue): datos/foto y cambio de contraseña local con clave actual y confirmación. | No hay silenciado de correo. ADMIN tiene correo solo lectura; POSTULANTE no puede editar correo. No hay descripción genérica editable para todos. Cuentas creadas solo con Google continúan accediendo con Google; este formulario no es recuperación ni creación de clave sin contraseña actual. |
| RF-22 | [Gestión de socios](src/views/admin/AdminSociosView.vue) busca también por BPS; Caja usa sus campos fiscales. | No asumir que ambos buscadores son idénticos. |
| RF-24 | [Directorio](src/views/socio/SocioDirectorioView.vue) exclusivo de directivos. | Backend lista solo activos, no todos los dados de baja. |
| RNF-03 | Roles, autenticación, Google y bloqueo de rutas. | No se encontraron pantallas/aceptación de términos y privacidad ni workflows SAST/DAST. HTTPS forzado requiere revisar el proxy externo; [Nginx del contenedor](nginx.conf) escucha HTTP 80. |
| RNF-05 | Consumo de operaciones que disparan correo SMTP del backend. | No hay envío Gmail API; validar recepción real manualmente. |
| RNF-06 | Interfaz clara responsive con marca CCISJ, tipografía Inter y modo claro/oscuro. | Implementado el 23/11/2026: tipografía única Inter; modo oscuro con selector sol/luna ([useTheme](src/composables/useTheme.ts), [ThemeToggle](src/components/ThemeToggle.vue), [tokens](src/assets/css/theme.css)). El modo claro conserva los colores anteriores. Ver `casos de uso/RNF-06-diseno-y-tema.md`. |
| RNF-07 | Caja, consultas y catálogo existen y se pueden medir. | Falta evidencia del umbral **< 2 s**. No excluir rendimiento como si el flujo no existiera. |

No escribir E2E que intente silenciar correo, importar CSV o editar campos inexistentes. Registrar esas funciones como desarrollo/cambio de alcance pendiente, no como casos aprobados u omitidos silenciosamente.

SAST/DAST y Playwright/GreenMail requieren implementación de infraestructura: su ausencia debe quedar trazada; no se consideran controles actuales ejecutados.

### Automatización e IA

Excel de Caja: las columnas de saldo de Resumen y Por mes muestran crédito positivo con `+` verde, deuda negativa con `-` rojo y cero sin signo ni color. La columna Saldo a favor usa el mismo formato. La inversión de signo se limita al Excel; no cambia saldos de API, deudas ni pagos. La prueba [cajaExcelService.test.mjs](tests/cajaExcelService.test.mjs) comprueba valores numéricos y formatos después de descargar y reabrir el archivo.

Cambio RF-18 (11/11/2026): build aprobado y dos pruebas Playwright (escritorio/móvil) en [applicant-password.ui.spec.ts](e2e/applicant-password.ui.spec.ts). Comprueban validación/coincidencia, error de contraseña actual, limpieza tras éxito y renovación de sesión. La API está simulada: estas pruebas verifican UI/contrato, no persistencia real de la clave en BD.

Priorizar pruebas repetibles y evidencia generada por CI. La IA puede ayudar a derivar casos del RF, generar pruebas/fixtures, interpretar errores y corregir código, con revisión del equipo y respetando las reglas académicas aplicables. No sustituir ejecución real por una explicación de la IA ni adaptar el resultado esperado para aprobar un incumplimiento.

- Automatizar reglas pequeñas con Vitest/Node; reservar Playwright para integración visible y los recorridos críticos del plan principal.
- Descargar y leer Excel automáticamente para comprobar datos; mantener solo una revisión visual de compatibilidad manual.
- Automatizar tamaños de pantalla, navegación por teclado, mensajes de error, doble clic y persistencia tras recarga/nueva sesión. La aceptación estética sigue siendo humana.
- Generar reportes y trazas asociados a commits; conservar fallos y no esconderlos con reintentos u omisiones.
- Usar datos sintéticos. Las pruebas con mocks no demuestran que backend, BD, SMTP o almacenamiento reales funcionan.
- Mantener manuales Google/Gmail reales y UAT; no intentar evadir controles del proveedor para automatizar el login.

El objetivo es reducir la regresión manual, no prometer un porcentaje arbitrario de automatización ni afirmar cumplimiento de funcionalidades ausentes.

## 1. Fase 1 — Unitarias, tipos y CI

- [x] Ejecutar Vitest y las pruebas Node existentes; validación local: 10 + 27 aprobadas, sin omisiones.
- [ ] Cubrir filtros de Caja: búsqueda por razón social/RUT/cédula/rubro, estados y “Con deuda” por saldo positivo, incluidos inactivos.
- [ ] Verificar Cobro: disponible para inactivos con deuda, oculto sin deuda o con crédito; desaparece tras saldar sin reactivar la cuenta.
- [ ] Verificar validaciones de importes, fechas, campos obligatorios y mensajes de error.
- [ ] Verificar Excel: Desde/Hasta inclusivos, rangos abiertos, rango invertido, período vacío y contenido real del archivo.
- [ ] Cubrir datos ficticios/importación masiva y actualización de las vistas tras guardar.
- [ ] Verificar estados de sesión por rol y errores 401/403; recordar que el backend también debe validar permisos.
- [ ] Documentar las diferencias de la tabla anterior y aprobar resultados esperados antes de automatizarlos; no reemplazar el RF original por el comportamiento actual sin acuerdo.
- [x] Incorporar al workflow de tests tanto `node --test` como el build, además de Vitest y tipos. Ejecución remota pendiente.
- [ ] Conservar reportes de pruebas y relacionarlos con el commit probado.

Base automatizada: el workflow reutilizable ejecuta Vitest, los tests Node, tipos/build y Playwright sobre el build servido localmente. El deploy depende de ese workflow antes de publicar la imagen. Se conservan reporte HTML, JUnit y trazas/capturas de fallos de Playwright como artifacts.

La suite [access.ui.spec.ts](e2e/access.ui.spec.ts) cubre selección de roles, formularios, limpieza de credenciales, rutas protegidas sin sesión y validación del identificador de socio, en Chromium escritorio y móvil. **Es smoke de UI pública, no los ocho E2E de stack real**: no prueba login exitoso, cobros ni persistencia en BD. Esos recorridos siguen pendientes.

Validación local del 11/11/2026 sobre estos cambios: 10 pruebas Vitest, 27 pruebas Node (incluida lectura del Excel generado), build de producción y 16 ejecuciones Playwright aprobadas, sin reintentos. La ejecución remota de GitHub Actions queda pendiente de publicar los cambios. La instalación informó alertas de dependencias; no se aplicaron actualizaciones forzadas fuera de alcance.

### Comandos disponibles

Desde la raíz del frontend, con las dependencias instaladas:

```powershell
npm test
node --test .\tests\*.test.mjs
npm run build
npm run test:ci
npx playwright install chromium
npm run test:ui
```

El runner Node utilizado debe soportar las importaciones TypeScript presentes en los tests; fijar y verificar una versión compatible en CI antes de incorporarlos.

## 2. Fase 2 — UI y E2E smoke

### Preparación

- [ ] Configurar Playwright y el arranque de frontend/backend de prueba.
- [ ] Utilizar PostgreSQL Docker y GreenMail del entorno de integración, nunca producción.
- [ ] Sembrar cuentas sintéticas por rol y reiniciar datos entre escenarios.
- [ ] Capturar trazas/reportes/capturas ante fallos, sin exponer credenciales.
- [ ] Mantener mocks de UI separados de los E2E de stack real.

### Recorridos prioritarios

- [ ] Login local por los tres roles, navegación y bloqueo de rutas ajenas.
- [ ] ADMIN: filtros de Caja, cobro parcial/total y actualización de saldo tras recargar.
- [ ] ADMIN: historial de suscripciones, fecha manual, programación futura y cancelación.
- [ ] SOCIO: crear/editar/pausar/cerrar oferta y revisar postulaciones.
- [ ] Nombre de empresa visible por defecto; al desmarcar, “Empresa reservada” en ofertas y Mis postulaciones.
- [ ] POSTULANTE: postulación con perfil propio y CV; prevención de duplicados.
- [ ] RF-23: pausar/reanudar, persistencia y visibilidad distinta para SOCIO/ADMIN.
- [ ] CV único por perfil: manual/archivo, reemplazo con confirmación y eliminación.
- [ ] Foto de perfil por rol persistente tras cerrar e iniciar sesión.
- [ ] Campana: últimas notificaciones por fecha DESC, límite visible, desplazamiento y “Ver todas”.
- [ ] Pop-up bloqueante de comunicado: completar la acción y no reaparecer indebidamente.
- [ ] Selección/no selección: notificación con empresa real aunque la oferta tenga nombre reservado; correo capturado validado junto con backend.

## 3. Manual/UAT y profundización

- [ ] Google OAuth real con cuentas de prueba: login, registro, vínculo y cancelación.
- [ ] Correos recibidos por Gmail: formato HTML, remitente y botones; no confundir captura SMTP con entrega real.
- [ ] Automatizar descarga y lectura de Excel para contrastar filas/importes/fechas; abrir manualmente una muestra para compatibilidad visual.
- [ ] Automatizar recorridos en escritorio/móvil y detectar desbordamientos; completar revisión visual de formularios, modales, tablas y campana.
- [ ] Automatizar teclado, foco, etiquetas y estados cargando/vacío/error/reintentar; complementar con revisión de usabilidad.
- [ ] Automatizar API lenta/fallida y doble clic: no duplicar acciones ni mostrar éxito cuando hubo error.
- [ ] Evaluar exportaciones y otros flujos adicionales con volumen sintético; acordar sus umbrales específicos sin sustituir el límite ya fijado por RNF-07.
- [ ] RNF-07: exigir **< 2000 ms** en filtrado de Caja, consultas contables y catálogo, con volumen/concurrencia/entorno definidos. Medir hasta actualización visible, además de latencia API; conservar muestras y fallos, no solo promedios.
- [ ] Registrar aceptación UAT por rol y repetir smoke sobre la versión candidata a entrega.

## 4. Cierre y evidencia

Usar los IDs E2E y la plantilla de evidencia del plan principal. Registrar caso/RF, commit frontend/backend, entorno, resultado, captura/reporte e incidencia.

El frontend no se considera validado solo porque compila: deben pasar los recorridos críticos, comprobarse persistencia contra backend y completarse la aceptación manual. Las pruebas anteriores reportadas en producción son antecedentes, no reemplazan la suite automatizada pendiente.

Las funciones no implementadas se mantienen como brechas abiertas hasta desarrollarlas o aprobar un cambio de alcance; no se afirma cumplimiento total de RF/RNF por probar únicamente lo existente.

Playwright y el workflow ya están incorporados para el smoke público descrito. El resto de casillas se cierra únicamente con evidencia de la capacidad correspondiente; configurar el runner no completa por sí solo todos los E2E ni todos los RF/RNF.

## Evidencia adicional RF-05 — 11/11/2026

- En Caja → Historial se mantiene el saldo operativo y se agrega **Historial contable inmutable**, independiente del filtro de fechas operativo. Muestra emisiones/anulaciones, vínculo al original, importe firmado, autor, fecha técnica, motivo y snapshot con fecha de negocio.
- Permite anular cuotas con motivo obligatorio (máximo 1000 caracteres), conservando el original. El backend rechaza cuentas con pagos o cuotas con reintegros vinculados; pagos aplicados no se editan/borran. Tras anular se recargan historial y resumen de Caja.
- Verificado: `npm test -- --run src\services\cajaService.spec.ts src\utils\cajaFilters.spec.ts` (**11 tests**, 0 fallos) y `npm run build` (TypeScript/Vite correcto; persiste aviso de chunks grandes).
- Pendiente de prueba visual/E2E de este nuevo panel: carga/error/reintento, formulario, rechazo de conciliación, actualización de saldo y navegación entre socios. Los tests del cliente verifican ruta de consulta, POST con motivo y propagación del conflicto; no acreditan interacción DOM ni compliance universal.
- Límite: los datos migrados muestran autor `MIGRACION`, sin atribuirles un autor histórico desconocido. La protección depende de triggers y permisos de PostgreSQL, no es invulnerable ante propietarios/superusuarios que los alteren. No se ejecutó ni desplegó contra producción.

## Cobertura 100% de líneas — 23/11/2026

`npm run test:ci` aprobado: **609 pruebas Vitest** (79 archivos) y **27 pruebas Node**, más el
build. `npm run test:ui`: **18 pruebas Playwright** aprobadas. Sin exclusiones en la cobertura:

| Métrica | Cubierto | Total | Porcentaje |
|---|---:|---:|---:|
| Líneas / sentencias | 9191 | 9191 | 100% |
| Ramas | 3158 | 3201 | 98,65% |
| Funciones | 573 | 577 | 99,30% |

Partida del mismo día: 7% de líneas. Las vistas y componentes se prueban con `@vue/test-utils`
y `jsdom` (comentario `// @vitest-environment jsdom` en cada spec). `services/types.ts` solo tiene
tipos y queda en 0/0 líneas ejecutables.

- Cambios de producción hechos junto con los tests:
  - `SocioBolsaEmpleoView`: se quitó un `<style scoped>` que estaba dentro del `<template>`. Vue
    nunca lo aplicaba, y en modo dev/test la vista no compilaba.
  - Caja: el mensaje de reintegro recurrente decía "puntual".
  - `SocioMisOfertasView`: ahora muestra los errores de carga, guardado y cambio de estado.
  - Registro: si falla el PDF del CV manual, el alta igual se completa.
  - Registro: se quitó el estado `checkingAvailability`, que nunca se activaba.
  - `AdminShell`: las props con valor por defecto pasan a ser opcionales.
- Pendiente fuera de cobertura: `npm run lint` informa 87 errores previos, `no-undef` de globals
  del navegador en `.vue`, porque `eslint.config.js` no declara `globals.browser`. Lint no corre en CI.

## Cobertura tras la paginación en el servidor — 23/11/2026

`npm run test:ci` aprobado: **626 pruebas Vitest**, **27 pruebas Node** y build. `npm run test:ui`:
**60 pruebas Playwright**. Cobertura: **100% de líneas** y 98,53% de ramas.
`tests/applicantFilters.test.mjs` se reescribió: el filtrado de postulantes ahora lo hace el backend,
y el composable solo arma los parámetros.

## Metodología BEM en el CSS — 23/11/2026

Todo el CSS del frontend sigue BEM (`bloque__elemento--modificador`): sin estilos por etiqueta
(`.bloque h2`) ni bloques anidados (`.bloque-a .bloque-b`). De 2384 selectores, 0 violan BEM; las 271
reglas `#app h1`, `#app input`, etc. son la capa de estilos base global y quedan como excepción.

- Se convirtieron unos 680 selectores: las etiquetas pasaron a elementos BEM
  (`.brand-panel__copy h1` → `.brand-panel__copy-title`) y los bloques anidados a *mixes*
  (`.login-form .app-button` → `.login-form__app-button`).
- Se eliminaron 113 selectores muertos de pantallas que ya no existen.
- `PasswordInput` (`input-class`) y `AppAlert` (`text-class`) reciben la clase de la vista que los usa,
  para no estilizar su interior desde afuera.
- En 19 clases se repite la propia clase (`.x.x`) para conservar la prioridad que tenía el selector
  anidado original. No anida ni usa etiquetas.
- Verificación: regresión visual de 36 pantallas y estados × claro/oscuro × escritorio/celular
  (144 capturas) píxel a píxel contra el diseño anterior, más comparación de estilos computados
  elemento por elemento. Sin diferencias, salvo dos intencionales:
  - el registro, que suma el botón "Volver al inicio" y el botón de Google a ancho completo;
  - el campo de contraseña en "Mi perfil", que ahora deja lugar al ícono del ojo (antes el texto
    quedaba debajo).
  `npm run test:ci` (639 Vitest, 27 Node, build), 60 E2E y 100% de líneas.
