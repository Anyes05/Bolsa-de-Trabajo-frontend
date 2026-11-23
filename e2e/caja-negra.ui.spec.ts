import { expect, test, type Page, type Route } from '@playwright/test'

/*
 * Pruebas de CAJA NEGRA de la interfaz (ver testing-caja-negra.md).
 * Se usa la app compilada en un navegador real, como lo haría una persona usuaria: se completan
 * formularios, se hace clic y se verifica lo que se ve. Los casos salen de los requerimientos
 * (particiones de equivalencia, valores límite, tabla de decisión y transición de estados), no del código.
 * La API se simula con respuestas que respetan el contrato del backend, para que cada caso sea reproducible.
 */

type Respuesta = { status?: number, json?: unknown }
type Manejador = (route: Route) => Respuesta | Promise<Respuesta>

const OFERTA = {
  id: 7, mostrarNombreEmpresa: true, socioId: 3, socioNombre: 'Ferretería Centro', rubroId: 1, rubro: 'Ventas',
  titulo: 'Vendedor/a de mostrador', cargo: 'Vendedor', descripcion: 'Atención al público y caja.', requisitos: null,
  zona: 'San José de Mayo', salario: null, tipoContrato: 'EFECTIVO', disponibilidadHoraria: 'FULL_TIME', vacantes: 1,
  fechaPublicacion: '2026-11-01T10:00:00Z', fechaCierre: '2026-12-31', estado: 'ACTIVA', postulaciones: 0,
}
const PERFIL = {
  id: 11, nombre: 'Perfil Ventas', disponibilidadHoraria: 'FULL_TIME', tieneVehiculo: false, libreta: null,
  ultimoEmpleo: null, descripcionExperiencia: null, visible: true, rubros: ['Ventas'],
}
const CV = { id: 21, perfilLaboralId: 11, nombreArchivo: 'mi-cv.pdf', activo: true }
const RUBROS = [{ id: 1, nombreRubro: 'Ventas' }, { id: 2, nombreRubro: 'Logística' }]

function sesion(role: 'ADMIN' | 'SOCIO' | 'POSTULANTE', extra: Record<string, unknown> = {}) {
  return { token: `token-${role.toLowerCase()}`, email: `${role.toLowerCase()}@example.test`, role, fullName: 'Persona Prueba', ...extra }
}

/** Simula la API: cada ruta exacta tiene su respuesta; lo no previsto responde vacío. */
async function simularApi(page: Page, manejadores: Record<string, Manejador>, llamadas: string[] = []) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const ruta = url.pathname.replace(/^\/api/, '')
    llamadas.push(`${route.request().method()} ${ruta}`)
    const clave = Object.keys(manejadores).find((patron) => `${route.request().method()} ${ruta}` === patron || ruta === patron)
    if (clave) {
      const { status = 200, json = {} } = await manejadores[clave](route)
      await route.fulfill({ status, json })
      return
    }
    if (ruta.includes('notificaciones')) return route.fulfill({ json: [] })
    if (ruta.endsWith('/permanencia')) return route.fulfill({ json: { requiereAccion: false } })
    if (ruta.endsWith('/datos-personales')) return route.fulfill({ json: { nombreCompleto: 'Persona Prueba', email: 'postulante@example.test', cedulaIdentidad: '12345678', telefono: '099', zonaResidencia: 'San José de Mayo', fotoUrl: null } })
    return route.fulfill({ json: route.request().method() === 'GET' ? [] : {} })
  })
  return llamadas
}

async function iniciarSesionComo(page: Page, session: ReturnType<typeof sesion>) {
  await page.addInitScript((valor) => sessionStorage.setItem('ccisj-session', JSON.stringify(valor)), session)
}

async function completarLogin(page: Page, rol: 'POSTULANTE' | 'SOCIO', identificador: string, clave: string) {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(`^${rol}`) }).click()
  const etiqueta = rol === 'SOCIO' ? 'BPS o cédula' : 'Gmail / Correo electrónico'
  await page.getByRole('textbox', { name: etiqueta, exact: true }).fill(identificador)
  await page.locator('#login-password').fill(clave)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

test.describe('CN-UI ingreso (RF-19)', () => {
  test('CN-UI-01 credenciales válidas de postulante llevan a Ofertas de Empleo', async ({ page }) => {
    const postulante = sesion('POSTULANTE')
    await simularApi(page, {
      'POST /auth/login': () => ({ json: postulante }),
      '/auth/me': () => ({ json: postulante }),
      '/postulante/ofertas': () => ({ json: [OFERTA] }),
    })
    await completarLogin(page, 'POSTULANTE', 'postulante@example.test', 'Clave-Valida-1')
    await expect(page).toHaveURL(/\/postulante\/ofertas-empleo$/)
    await expect(page.getByRole('heading', { name: OFERTA.titulo })).toBeVisible()
  })

  test('CN-UI-02 clave incorrecta (401) muestra un mensaje claro y no ingresa', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': () => ({ status: 401, json: { message: 'Unauthorized' } }) })
    await completarLogin(page, 'POSTULANTE', 'postulante@example.test', 'Clave-Mala-1')
    await expect(page.getByText('Usuario o contraseña incorrectos. Revisá tus datos e intentá nuevamente.')).toBeVisible()
    await expect(page).toHaveURL('http://127.0.0.1:4173/')
  })

  test('CN-UI-03 demasiados intentos (429) muestra el aviso del servidor', async ({ page }) => {
    const aviso = 'Demasiados intentos de ingreso. Esperá 15 minutos e intentá de nuevo.'
    await simularApi(page, { 'POST /auth/login': () => ({ status: 429, json: { detail: aviso } }) })
    await completarLogin(page, 'POSTULANTE', 'postulante@example.test', 'Clave-Mala-1')
    await expect(page.getByText(aviso)).toBeVisible()
  })

  test('CN-UI-04 contraseña vacía se rechaza sin llamar a la API', async ({ page }) => {
    const llamadas = await simularApi(page, {})
    await completarLogin(page, 'POSTULANTE', 'postulante@example.test', '   ')
    await expect(page.getByText('Ingresá tu contraseña para continuar.')).toBeVisible()
    expect(llamadas.filter((llamada) => llamada.includes('/auth/login'))).toHaveLength(0)
  })

  test('CN-UI-05 socio con clave provisional es llevado a cambiarla antes de usar la bolsa', async ({ page }) => {
    const socio = sesion('SOCIO', { debeCambiarPassword: true, esDirectivo: false })
    await simularApi(page, {
      'POST /auth/login': () => ({ json: socio }),
      '/auth/me': () => ({ json: socio }),
    })
    await completarLogin(page, 'SOCIO', '12345678', 'Provisional-1a')
    await expect(page).toHaveURL(/\/socio\/cambiar-clave$/)
    // Mientras la clave siga pendiente, intentar entrar a la bolsa vuelve al cambio de clave.
    await page.goto('/socio/bolsa-empleo')
    await expect(page).toHaveURL(/\/socio\/cambiar-clave$/)
  })
})

test.describe('CN-UI-06 tabla de decisión: rol de la sesión × área solicitada', () => {
  const casos = [
    { rol: 'POSTULANTE', pide: '/admin', termina: /\/postulante\/ofertas-empleo$/ },
    { rol: 'POSTULANTE', pide: '/socio/bolsa-empleo', termina: /\/postulante\/ofertas-empleo$/ },
    { rol: 'SOCIO', pide: '/admin/socios', termina: /\/socio\/bolsa-empleo$/ },
    { rol: 'SOCIO', pide: '/postulante/mis-perfiles', termina: /\/socio\/bolsa-empleo$/ },
    { rol: 'ADMIN', pide: '/socio/mis-ofertas', termina: /\/admin$/ },
    { rol: 'ADMIN', pide: '/postulante/ofertas-empleo', termina: /\/admin$/ },
  ] as const
  for (const caso of casos) {
    test(`${caso.rol} que abre ${caso.pide} vuelve a su inicio`, async ({ page }) => {
      const session = sesion(caso.rol, { esDirectivo: false, debeCambiarPassword: false })
      await simularApi(page, { '/auth/me': () => ({ json: session }) })
      await iniciarSesionComo(page, session)
      await page.goto(caso.pide)
      await expect(page).toHaveURL(caso.termina)
    })
  }
})

test.describe('CN-UI registro de postulante (RF-18)', () => {
  async function completarPaso1(page: Page, clave: string, confirmacion = clave, correo = 'nuevo@example.test') {
    await simularApi(page, { '/sectors': () => ({ json: RUBROS }) })
    await page.goto('/registro')
    await page.locator('#fullName').fill('Ana Pérez')
    await page.locator('#identityCard').fill('48765432')
    await page.locator('#phone').fill('099123456')
    await page.locator('#email').fill(correo)
    await page.locator('#password input, input#password').first().fill(clave)
    await page.locator('#confirmPassword input, input#confirmPassword').first().fill(confirmacion)
    await page.locator('#residenceArea').selectOption({ index: 1 })
    await page.getByRole('button', { name: /Continuar/ }).click()
  }

  const casos = [
    { caso: '7 caracteres (límite inferior - 1)', clave: 'Aa1-aaa', valida: false },
    { caso: '8 caracteres (límite inferior)', clave: 'Aa1-aaaa', valida: true },
    { caso: 'sin mayúscula (partición inválida)', clave: 'aa1-aaaa', valida: false },
    { caso: 'sin carácter especial (partición inválida)', clave: 'Aa1aaaaa', valida: false },
  ]
  for (const { caso, clave, valida } of casos) {
    test(`CN-UI-07 contraseña con ${caso} ${valida ? 'permite avanzar' : 'se rechaza'}`, async ({ page }) => {
      await completarPaso1(page, clave)
      if (valida) {
        await expect(page.getByRole('heading', { name: /Primer Perfil Laboral/ })).toBeVisible()
      } else {
        await expect(page.getByText('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.')).toBeVisible()
        await expect(page.getByRole('heading', { name: /Datos Personales/ })).toBeVisible()
      }
    })
  }

  test('CN-UI-08a confirmación de contraseña distinta impide avanzar', async ({ page }) => {
    await completarPaso1(page, 'Aa1-aaaa', 'Aa1-aaab')
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Datos Personales/ })).toBeVisible()
  })

  test('CN-UI-08b correo sin @ es bloqueado por el formulario y no avanza', async ({ page }) => {
    await completarPaso1(page, 'Aa1-aaaa', 'Aa1-aaaa', 'correo-sin-arroba')
    expect(await page.locator('#email').evaluate((campo: HTMLInputElement) => campo.validity.valid)).toBe(false)
    await expect(page.getByRole('heading', { name: /Datos Personales/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Primer Perfil Laboral/ })).toHaveCount(0)
  })
})

test.describe('CN-UI postulación a ofertas (RF-11)', () => {
  const postulante = sesion('POSTULANTE')

  async function abrirOfertas(page: Page, extra: Record<string, Manejador> = {}) {
    await iniciarSesionComo(page, postulante)
    await simularApi(page, {
      '/auth/me': () => ({ json: postulante }),
      'GET /postulante/ofertas': () => ({ json: [OFERTA, { ...OFERTA, id: 8, titulo: 'Chofer de reparto', rubroId: 2, rubro: 'Logística' }] }),
      '/postulante/ofertas/rubros': () => ({ json: RUBROS }),
      'GET /postulante/perfiles': () => ({ json: [PERFIL] }),
      'GET /postulante/cvs': () => ({ json: [CV] }),
      ...extra,
    })
    await page.goto('/postulante/ofertas-empleo')
    await expect(page.getByRole('heading', { name: OFERTA.titulo })).toBeVisible()
  }

  test('CN-UI-09 postularse con perfil y CV deja la oferta como “Postulado”', async ({ page }) => {
    let postulaciones: unknown[] = []
    await abrirOfertas(page, {
      'GET /postulante/ofertas/postulaciones': () => ({ json: postulaciones }),
      'POST /postulante/ofertas/7/postulaciones': (route) => {
        expect(route.request().postDataJSON()).toEqual({ perfilId: 11 })
        postulaciones = [{ id: 1, ofertaId: 7, ofertaTitulo: OFERTA.titulo, socioNombre: OFERTA.socioNombre, rubro: 'Ventas', fecha: '2026-11-20T12:00:00Z', estado: 'RECIBIDA', perfilId: 11, perfilNombre: 'Perfil Ventas', cvId: 21, cvNombre: 'mi-cv.pdf' }]
        return { status: 201, json: postulaciones[0] }
      },
    })
    const tarjeta = page.locator('.offer-card', { hasText: OFERTA.titulo })
    await tarjeta.getByRole('button', { name: 'Postularme' }).click()
    await expect(page.getByRole('heading', { name: 'Seleccionar Perfil' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar Postulación' }).click()
    await expect(page.getByText('Tu postulación se envió correctamente.')).toBeVisible()
    await expect(tarjeta.getByRole('button', { name: 'Postulado' })).toBeDisabled()
    await page.getByRole('button', { name: /Mis postulaciones \(1\)/ }).click()
    await expect(page.getByText('Recibida')).toBeVisible()
  })

  test('CN-UI-10 sin perfil visible con CV no se abre la postulación (partición inválida)', async ({ page }) => {
    await abrirOfertas(page, { 'GET /postulante/cvs': () => ({ json: [] }) })
    await page.locator('.offer-card', { hasText: OFERTA.titulo }).getByRole('button', { name: 'Postularme' }).click()
    await expect(page.getByText(/Para postularte necesitás al menos un perfil profesional visible con un CV/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seleccionar Perfil' })).toHaveCount(0)
  })

  test('CN-UI-11 si el servidor rechaza la postulación (409) se informa el motivo', async ({ page }) => {
    await abrirOfertas(page, {
      'POST /postulante/ofertas/7/postulaciones': () => ({ status: 409, json: { detail: 'La oferta ya no recibe postulaciones' } }),
    })
    await page.locator('.offer-card', { hasText: OFERTA.titulo }).getByRole('button', { name: 'Postularme' }).click()
    await page.getByRole('button', { name: 'Confirmar Postulación' }).click()
    await expect(page.getByText(/La oferta ya no recibe postulaciones/)).toBeVisible()
  })

  test('CN-UI-12 filtro por rubro: con resultados y sin resultados', async ({ page }) => {
    await abrirOfertas(page, { '/postulante/ofertas/rubros': () => ({ json: [...RUBROS, { id: 3, nombreRubro: 'Gastronomía' }] }) })
    const filtro = page.getByLabel('Filtrar por rubro')
    await filtro.selectOption({ label: 'Logística' })
    await expect(page.getByRole('heading', { name: 'Chofer de reparto' })).toBeVisible()
    await expect(page.getByRole('heading', { name: OFERTA.titulo })).toHaveCount(0)
    await filtro.selectOption({ label: 'Gastronomía' })
    await expect(page.getByText('No hay ofertas activas para este rubro.')).toBeVisible()
  })
})
