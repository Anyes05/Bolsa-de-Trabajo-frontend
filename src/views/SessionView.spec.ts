// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import SessionView from './SessionView.vue'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../services/types'

vi.mock('../services/authService', () => ({ authService: { logout: vi.fn() } }))

const Vacia = defineComponent({ render: () => h('div') })

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'access', component: Vacia },
      { path: '/sesion', name: 'session', component: SessionView },
      { path: '/postulante/ofertas-empleo', name: 'postulante-bolsa-empleo', component: Vacia },
      { path: '/socio/bolsa-empleo', name: 'socio-bolsa-empleo', component: Vacia },
      { path: '/admin', name: 'admin-dashboard', component: Vacia },
    ],
  })
}

describe('vista de sesión iniciada', () => {
  const storage = new Map<string, string>()
  const ubicacion = { pathname: '/sesion', replace: vi.fn() }

  async function montar(role: Role | null) {
    const router = crearRouter()
    await router.push('/sesion')
    await router.isReady()
    if (role) useAuthStore().setSession({ token: 'tok', email: 'persona@test.uy', role })
    const wrapper = mount(SessionView, { global: { plugins: [router] } })
    await flushPromises()
    return { wrapper, router }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    ubicacion.pathname = '/sesion'
    vi.stubGlobal('location', ubicacion)
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['POSTULANTE', 'postulante-bolsa-empleo', '/postulante/ofertas-empleo'],
    ['SOCIO', 'socio-bolsa-empleo', '/socio/bolsa-empleo'],
    ['ADMIN', 'admin-dashboard', '/admin'],
  ] as const)('redirige al %s a su inicio y fuerza la recarga si hace falta', async (role, nombre, ruta) => {
    const { router } = await montar(role)
    expect(router.currentRoute.value.name).toBe(nombre)
    expect(ubicacion.replace).toHaveBeenCalledWith(ruta)
  })

  it.each([
    ['POSTULANTE', '/postulante/ofertas-empleo'],
    ['SOCIO', '/socio/bolsa-empleo'],
    ['ADMIN', '/admin'],
  ] as const)('no recarga al %s si el navegador ya está en su inicio', async (role, ruta) => {
    ubicacion.pathname = ruta
    await montar(role)
    expect(ubicacion.replace).not.toHaveBeenCalled()
  })

  it('sin rol se queda en la sesión y permite cerrarla', async () => {
    const { wrapper, router } = await montar(null)
    expect(router.currentRoute.value.name).toBe('session')
    expect(wrapper.find('p').text()).toBe('Sesión iniciada')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('access')
    expect(ubicacion.replace).not.toHaveBeenCalled()
  })

  it('al cerrar sesión limpia el store y vuelve al acceso', async () => {
    const { wrapper, router } = await montar('ADMIN')
    expect(wrapper.find('h1').text()).toBe('persona@test.uy')
    expect(wrapper.find('span').text()).toBe('ADMIN')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(authService.logout).toHaveBeenCalled()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('access')
  })
})
