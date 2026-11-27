# Testing de caja negra — Frontend (interfaz)

Fecha: 23/11/2026. Complementa `testing.md` (caja blanca / cobertura Vitest).

## Qué es y cómo se hizo

En las pruebas de caja negra se prueba la aplicación **como la usa una persona, sin mirar el código**.
Los casos se diseñan desde los requerimientos (RF-01, RF-03, RF-05 y RF-23) y se verifica solo lo que se ve
en pantalla y la URL final.

- **Herramienta:** Playwright, sobre la aplicación **compilada**
  (`npm run build` + `vite preview`) y en un navegador Chromium real.
- **Dispositivos:** cada caso se ejecuta en dos, escritorio (Desktop Chrome) y celular (Pixel 7).
- **API:** se simula con `page.route`, con respuestas que respetan el contrato del backend. Así cada
  caso es reproducible y no depende de datos de una base.
  - La integración real con el backend se prueba aparte, en la caja negra de la API
    (`testing-caja-negra.md` del repo backend).
- **Técnicas usadas:**
  - **PE**: particiones de equivalencia.
  - **VL**: valores límite.
  - **TD**: tabla de decisión.
  - **TE**: transición de estados.
  - **CU**: escenario de caso de uso.

### Ejecución

```bash
npm run build
npm run test:ui          # todos los E2E (ya corre en CI: workflow test.yml)
npx playwright test e2e/caja-negra.ui.spec.ts   # solo los casos nuevos
```

### Resultado

`npm run test:ui`: **60 pruebas aprobadas, 0 fallidas**. Son 30 casos ejecutados en escritorio y
en celular.

| Archivo | Casos | Origen |
|---|---|---|
| `e2e/access.ui.spec.ts` | 8 | Ya existía |
| `e2e/applicant-password.ui.spec.ts` | 1 | Ya existía |
| `e2e/caja-negra.ui.spec.ts` | 21 | Nuevo |

## Casos de prueba

### Ingreso y sesión (RF-01)

| ID | Técnica | Pasos / entrada | Resultado esperado | Obtenido |
|---|---|---|---|---|
| CN-UI-01 | CU, PE válida | Rol Postulante, correo y clave válidos → Ingresar | Va a `/postulante/ofertas-empleo` y se ven las ofertas | ✅ |
| CN-UI-02 | PE inválida | Clave incorrecta (la API responde 401) | "Usuario o contraseña incorrectos…"; sigue en el inicio | ✅ |
| CN-UI-03 | PE inválida | Demasiados intentos (la API responde 429) | Se muestra el aviso del servidor ("Esperá 15 minutos…") | ✅ |
| CN-UI-04 | PE inválida | Contraseña vacía o con solo espacios | "Ingresá tu contraseña para continuar."; **no** se llama a la API | ✅ |
| CN-UI-05 | TE | Socio con clave provisional ingresa → intenta abrir la bolsa | Va a `/socio/cambiar-clave` y no puede salir de ahí hasta cambiarla | ✅ |
| RF-01 (existente) | PE | Elegir cada uno de los 3 roles | Se muestran los 3 roles con el formulario correcto (tipo de dato del campo) y se limpia al volver | ✅ |
| RF-01 (existente) | TD | Sin sesión, abrir `/admin`, `/socio/bolsa-empleo` o `/postulante/ofertas-empleo` | Vuelve al inicio | ✅ |
| RF-01 (existente) | PE inválida | Socio con un identificador sin números | Mensaje de validación, sin llamar a la API | ✅ |

### CN-UI-06 — Tabla de decisión: rol de la sesión × área solicitada

| Sesión | Abre | Termina en | Obtenido |
|---|---|---|---|
| Postulante | `/admin` | `/postulante/ofertas-empleo` | ✅ |
| Postulante | `/socio/bolsa-empleo` | `/postulante/ofertas-empleo` | ✅ |
| Socio | `/admin/socios` | `/socio/bolsa-empleo` | ✅ |
| Socio | `/postulante/mis-perfiles` | `/socio/bolsa-empleo` | ✅ |
| Admin | `/socio/mis-ofertas` | `/admin` | ✅ |
| Admin | `/postulante/ofertas-empleo` | `/admin` | ✅ |

### Registro de postulante y contraseñas (RF-03 y RF-05)

| ID | Técnica | Entrada (paso 1 del registro) | Resultado esperado | Obtenido |
|---|---|---|---|---|
| CN-UI-07 | VL | Clave de 7 caracteres (`Aa1-aaa`) | Mensaje de política de contraseña; no avanza | ✅ |
| CN-UI-07 | VL | Clave de 8 caracteres (`Aa1-aaaa`) | Avanza a "Primer Perfil Laboral" | ✅ |
| CN-UI-07 | PE inválida | Clave sin mayúscula | Mensaje de política de contraseña; no avanza | ✅ |
| CN-UI-07 | PE inválida | Clave sin carácter especial | Mensaje de política de contraseña; no avanza | ✅ |
| CN-UI-08a | PE inválida | La confirmación no coincide con la clave | "Las contraseñas no coinciden."; no avanza | ✅ |
| CN-UI-08b | PE inválida | Correo sin `@` | El navegador marca el campo como inválido y no avanza | ✅ |
| RF-05 (existente) | PE / TE | Cambio de clave del postulante: confirmación distinta → clave actual incorrecta → correcta | El botón queda deshabilitado; luego se ve el error del servidor; por último el éxito, con los campos limpios y la sesión renovada | ✅ |

### Postulación a ofertas (RF-23)

| ID | Técnica | Pasos / entrada | Resultado esperado | Obtenido |
|---|---|---|---|---|
| CN-UI-09 | CU | Postularme → elegir perfil con CV → Confirmar | "Tu postulación se envió correctamente."; el botón pasa a "Postulado" (deshabilitado); "Mis postulaciones (1)" muestra el estado "Recibida" | ✅ |
| CN-UI-10 | PE inválida | Postularme sin ningún perfil visible con CV | Aviso para crear un perfil o subir un CV; no se abre la selección de perfil | ✅ |
| CN-UI-11 | PE inválida | El servidor rechaza la postulación (409, oferta cerrada) | Se muestra el motivo: "La oferta ya no recibe postulaciones" | ✅ |
| CN-UI-12 | PE | Filtrar por un rubro con ofertas y por uno sin ofertas | Solo se ven las ofertas de ese rubro; "No hay ofertas activas para este rubro." | ✅ |

## Observaciones

- **Validación del correo en el registro (CN-UI-08b):** la hace el navegador (`type="email"`) antes
  que la app, así que el mensaje propio "El correo no es válido." solo aparece si la validación del
  navegador no actúa. El resultado igual es correcto: no se puede avanzar.
- **Respuestas simuladas:** si el backend cambia su contrato (nombres de campos o códigos de estado),
  estas pruebas no lo detectan. Para eso están las pruebas de caja negra de la API del backend, que
  corren contra la aplicación real.
