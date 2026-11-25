// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 60_000 })
import { createPinia, setActivePinia } from 'pinia'
import router from './index'
import { useAuthStore } from '../stores/auth'
import type { AuthResponse, Role } from '../services/types'

vi.mock('../services/authService', () => ({ authService: { logout: vi.fn(), currentUser: vi.fn() } }))
// La vista se prueba en su propio spec; acá basta un componente vacío para probar el router.
vi.mock('../views/socio/SocioBolsaEmpleoView.vue', () => ({ default: { name: 'SocioBolsaEmpleoFalsa', render: () => null } }))

describe('router y guards de navegación', () => {
  const storage = new Map<string, string>()

  function iniciarSesion(role: Role, extra: Partial<AuthResponse> = {}) {
    useAuthStore().setSession({ token: 'tok', email: 'u@test.uy', role, ...extra })
  }

  async function ir(path: string) {
    await router.push(path)
    return router.currentRoute.value
  }

  beforeEach(async () => {
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    setActivePinia(createPinia())
    await router.push('/')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('todas las rutas con carga diferida resuelven un componente', async () => {
    const diferidas = router.getRoutes()
      .map((ruta) => ruta.components?.default)
      .filter((componente): componente is () => Promise<{ default: unknown }> => typeof componente === 'function')
    expect(diferidas.length).toBeGreaterThanOrEqual(16)
    const modulos = await Promise.all(diferidas.map((cargar) => cargar()))
    modulos.forEach((modulo) => expect(modulo.default).toBeTruthy())
  }, 60_000)

  it('sin sesión permite el acceso, el registro, términos y permanencia', async () => {
    expect((await ir('/')).name).toBe('access')
    expect((await ir('/registro')).name).toBe('register')
    expect((await ir('/terminos')).name).toBe('terminos')
    expect((await ir('/permanencia')).name).toBe('permanencia')
  })

  it('redirige rutas desconocidas al acceso', async () => {
    expect((await ir('/no-existe/para-nada')).name).toBe('access')
  })

  it('pide autenticación en rutas protegidas', async () => {
    expect((await ir('/admin')).name).toBe('access')
    expect((await ir('/sesion')).name).toBe('access')
  })

  it.each([
    ['ADMIN', '/socio/bolsa-empleo', 'admin-dashboard'],
    ['SOCIO', '/admin/rubros', 'socio-bolsa-empleo'],
    ['POSTULANTE', '/admin', 'postulante-bolsa-empleo'],
  ] as const)('el rol %s no entra a %s y vuelve a su inicio', async (role, path, destino) => {
    iniciarSesion(role)
    expect((await ir(path)).name).toBe(destino)
  })

  it('cada rol accede a sus propias rutas', async () => {
    iniciarSesion('ADMIN')
    expect((await ir('/admin/socios')).name).toBe('admin-socios')
    iniciarSesion('POSTULANTE')
    expect((await ir('/postulante/mi-perfil')).name).toBe('postulante-mi-perfil')
  })

  it('con clave provisional obliga a cambiarla antes de navegar', async () => {
    iniciarSesion('SOCIO', { debeCambiarPassword: true })
    expect((await ir('/socio/perfil')).name).toBe('socio-cambiar-clave')
    expect((await ir('/socio/cambiar-clave')).name).toBe('socio-cambiar-clave')
  })

  it('sin clave provisional no deja entrar al cambio obligatorio de clave', async () => {
    iniciarSesion('SOCIO')
    expect((await ir('/socio/cambiar-clave')).name).toBe('socio-bolsa-empleo')
  })

  it('el directorio de socios es solo para directivos', async () => {
    iniciarSesion('SOCIO')
    expect((await ir('/socio/directorio')).name).toBe('socio-bolsa-empleo')
    iniciarSesion('SOCIO', { esDirectivo: true })
    expect((await ir('/socio/directorio')).name).toBe('socio-directorio')
  })

  it('con sesión, la vista de sesión y las rutas de invitado llevan al inicio del rol', async () => {
    iniciarSesion('ADMIN')
    expect((await ir('/sesion')).name).toBe('admin-dashboard')
    iniciarSesion('POSTULANTE')
    expect((await ir('/registro')).name).toBe('postulante-bolsa-empleo')
    expect((await ir('/')).name).toBe('postulante-bolsa-empleo')
    expect((await ir('/terminos')).name).toBe('terminos')
  })
})
