// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import SocioCambiarClaveView from './SocioCambiarClaveView.vue'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'
import { PASSWORD_HINT } from '../../utils/password'

vi.mock('../../services/authService', () => ({
  authService: { changePassword: vi.fn(), logout: vi.fn(), currentUser: vi.fn() },
}))

const Vacia = defineComponent({ render: () => h('div') })
const CLAVE_VALIDA = 'NuevaClave1!'

function diferido<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((ok) => { resolve = ok })
  return { promise, resolve }
}

describe('cambio de clave obligatorio del socio', () => {
  let pinia: Pinia
  let router: Router

  beforeEach(async () => {
    sessionStorage.clear()
    vi.resetAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setSession({ token: 'provisorio', email: 'socio@ejemplo.test', role: 'SOCIO', debeCambiarPassword: true })
    router = createRouter({
      history: createMemoryHistory(),
      routes: ['access', 'socio-bolsa-empleo', 'socio-cambiar-clave'].map((name) => ({ path: `/${name}`, name, component: Vacia })),
    })
    await router.push('/socio-cambiar-clave')
  })

  function montar() {
    return mount(SocioCambiarClaveView, { global: { plugins: [pinia, router] } })
  }

  async function completar(wrapper: VueWrapper, actual: string, nueva: string, repetida: string) {
    const campos = wrapper.findAll('input')
    await campos[0]!.setValue(actual)
    await campos[1]!.setValue(nueva)
    await campos[2]!.setValue(repetida)
  }

  it('bloquea el envío mientras los datos no son válidos', async () => {
    const wrapper = montar()
    const boton = wrapper.find('button[type="submit"]')
    expect(boton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain(PASSWORD_HINT)

    await completar(wrapper, 'provisoria', CLAVE_VALIDA, 'OtraClave1!')
    expect(boton.attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain(`Completa la clave actual y una nueva válida. ${PASSWORD_HINT}`)
    expect(authService.changePassword).not.toHaveBeenCalled()
  })

  it('guarda la nueva clave, actualiza la sesión y entra a la bolsa', async () => {
    const respuesta = diferido<Awaited<ReturnType<typeof authService.changePassword>>>()
    vi.mocked(authService.changePassword).mockReturnValueOnce(respuesta.promise)
    const wrapper = montar()
    await completar(wrapper, 'provisoria', CLAVE_VALIDA, CLAVE_VALIDA)
    const boton = wrapper.find('button[type="submit"]')
    expect(boton.attributes('disabled')).toBeUndefined()
    await wrapper.find('form').trigger('submit')
    expect(boton.text()).toBe('Guardando...')
    expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: 'provisoria', newPassword: CLAVE_VALIDA })

    respuesta.resolve({ token: 'definitivo', email: 'socio@ejemplo.test', role: 'SOCIO', debeCambiarPassword: false })
    await flushPromises()
    const auth = useAuthStore()
    expect(auth.token).toBe('definitivo')
    expect(auth.debeCambiarPassword).toBe(false)
    expect(router.currentRoute.value.name).toBe('socio-bolsa-empleo')
    expect(boton.text()).toBe('Guardar y continuar')
  })

  it('muestra el error del backend', async () => {
    vi.mocked(authService.changePassword).mockRejectedValueOnce(new Error('La clave actual es incorrecta'))
    const wrapper = montar()
    await completar(wrapper, 'provisoria', CLAVE_VALIDA, CLAVE_VALIDA)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('La clave actual es incorrecta')
    expect(router.currentRoute.value.name).toBe('socio-cambiar-clave')
  })

  it('permite cerrar sesión', async () => {
    vi.mocked(authService.logout).mockResolvedValueOnce(undefined as never)
    const wrapper = montar()
    await wrapper.find('.access-link').trigger('click')
    await flushPromises()
    expect(useAuthStore().token).toBeNull()
    expect(router.currentRoute.value.name).toBe('access')
  })
})
