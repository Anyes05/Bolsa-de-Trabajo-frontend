// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import PermanenciaConfirmView from './PermanenciaConfirmView.vue'
import { permanenciaService } from '../services/permanenciaService'
import { ApiRequestError } from '../services/http'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../services/types'

vi.mock('../services/permanenciaService', () => ({
  permanenciaService: { confirmarPorToken: vi.fn(), confirmarAutenticado: vi.fn() },
}))

const Vacia = defineComponent({ render: () => h('div') })
const estado = { requiereAccion: false, avisoPendiente: false, ocultoPorRetencion: false, deadline: null }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('vista de confirmación de permanencia', () => {
  const storage = new Map<string, string>()

  async function montar(url: string, role: Role | null = null) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'access', component: Vacia },
        { path: '/permanencia', name: 'permanencia', component: PermanenciaConfirmView },
        { path: '/postulante/ofertas-empleo', name: 'postulante-bolsa-empleo', component: Vacia },
      ],
    })
    await router.push(url)
    await router.isReady()
    if (role) useAuthStore().setSession({ token: 'tok', email: 'p@test.uy', role })
    const wrapper = mount(PermanenciaConfirmView, { global: { plugins: [router] } })
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
  })
  afterEach(() => vi.unstubAllGlobals())

  it('confirma por token del enlace, muestra el progreso y luego vuelve al acceso', async () => {
    const pendiente = deferred<void>()
    vi.mocked(permanenciaService.confirmarPorToken).mockReturnValue(pendiente.promise)
    const { wrapper, router } = await montar('/permanencia?token=abc')
    await flushPromises()
    expect(wrapper.text()).toContain('Confirmando tu permanencia...')
    pendiente.resolve()
    await flushPromises()
    expect(permanenciaService.confirmarPorToken).toHaveBeenCalledWith('abc')
    expect(wrapper.text()).toContain('Listo. Tu perfil vuelve a estar visible para las empresas socias.')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('access')
  })

  it('con sesión de postulante, Continuar lleva a las ofertas', async () => {
    vi.mocked(permanenciaService.confirmarPorToken).mockResolvedValue(undefined)
    const { wrapper, router } = await montar('/permanencia?token=abc', 'POSTULANTE')
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('postulante-bolsa-empleo')
  })

  it('muestra el error si el token es inválido o venció', async () => {
    vi.mocked(permanenciaService.confirmarPorToken).mockRejectedValue(
      new ApiRequestError(400, '/auth/permanencia/confirmar', null, 'El enlace venció.'),
    )
    const { wrapper } = await montar('/permanencia?token=viejo')
    await flushPromises()
    expect(wrapper.find('.app-alert--error').text()).toContain('El enlace venció.')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it.each([
    ['sin sesión', null],
    ['con sesión de socio', 'SOCIO'],
  ] as const)('sin token y %s pide iniciar sesión como postulante', async (_, role) => {
    const { wrapper } = await montar('/permanencia', role)
    await flushPromises()
    expect(wrapper.text()).toContain('Falta el enlace de confirmación. Iniciá sesión como postulante para confirmar tu permanencia.')
    expect(permanenciaService.confirmarPorToken).not.toHaveBeenCalled()
  })

  it('ignora un token repetido en la URL (no es texto) y lo trata como faltante', async () => {
    const { wrapper } = await montar('/permanencia?token=a&token=b')
    await flushPromises()
    expect(wrapper.text()).toContain('Falta el enlace de confirmación.')
  })

  it('el postulante con sesión confirma con un botón', async () => {
    vi.mocked(permanenciaService.confirmarAutenticado).mockResolvedValue(estado)
    const { wrapper } = await montar('/permanencia', 'POSTULANTE')
    await flushPromises()
    expect(wrapper.text()).toContain('Confirmá que querés seguir formando parte de la Bolsa de Empleo del CCISJ.')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(permanenciaService.confirmarAutenticado).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.app-alert--success').exists()).toBe(true)
  })

  it('muestra el error si falla la confirmación con sesión', async () => {
    vi.mocked(permanenciaService.confirmarAutenticado).mockRejectedValue(new Error('Failed to fetch'))
    const { wrapper } = await montar('/permanencia', 'POSTULANTE')
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo confirmar tu permanencia: no hay conexión con el servidor.')
  })
})
