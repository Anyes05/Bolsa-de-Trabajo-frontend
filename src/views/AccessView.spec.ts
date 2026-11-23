// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import AccessView from './AccessView.vue'
import { authService } from '../services/authService'
import { ApiRequestError } from '../services/http'
import { useAuthStore } from '../stores/auth'
import { useGoogleRegistrationStore } from '../stores/googleRegistration'
import type { AuthResponse, GoogleAuthResult } from '../services/types'

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), googleAuthenticate: vi.fn(), googleLink: vi.fn(), logout: vi.fn() },
}))

const Vacia = defineComponent({ render: () => h('div') })
const GoogleFalso = defineComponent({
  name: 'GoogleSignInButton',
  props: { disabled: Boolean },
  emits: ['credential'],
  render() { return h('div', { class: 'google-falso', 'data-disabled': String(this.disabled) }) },
})

const rutas: Array<[string, string]> = [
  ['register', '/registro'], ['terminos', '/terminos'], ['session', '/sesion'],
  ['socio-cambiar-clave', '/socio/cambiar-clave'], ['socio-bolsa-empleo', '/socio/bolsa-empleo'],
  ['postulante-bolsa-empleo', '/postulante/ofertas-empleo'], ['admin-dashboard', '/admin'],
]

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'access', component: AccessView },
      ...rutas.map(([name, path]) => ({ path, name, component: Vacia })),
    ],
  })
}

const sesion = (role: AuthResponse['role'], extra: Partial<AuthResponse> = {}): AuthResponse => ({
  token: 'tok', email: 'usuario@test.uy', role, fullName: 'Usuario', ...extra,
})
const credencial = { credential: 'jwt', nonce: 'n1' }

describe('vista de acceso', () => {
  let router: Router
  let wrapper: VueWrapper
  const storage = new Map<string, string>()
  const ubicacion = { pathname: '/', assign: vi.fn(), replace: vi.fn() }

  async function montar() {
    router = crearRouter()
    await router.push('/')
    await router.isReady()
    wrapper = mount(AccessView, {
      global: { plugins: [router], stubs: { GoogleSignInButton: GoogleFalso } },
    })
    return wrapper
  }

  async function elegirRol(indice: number) {
    await wrapper.findAll('.role-option')[indice].trigger('click')
  }

  async function enviar(identificador: string, clave: string) {
    await wrapper.find('#login-identifier').setValue(identificador)
    await wrapper.find('input#login-password').setValue(clave)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
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
    ubicacion.pathname = '/'
    vi.stubGlobal('location', ubicacion)
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  it('muestra los tres roles y el enlace de registro', async () => {
    await montar()
    const roles = wrapper.findAll('.role-option')
    expect(roles.map((rol) => rol.find('.role-option__text').text())).toEqual([
      expect.stringContaining('ADMINISTRADOR'), expect.stringContaining('SOCIO'), expect.stringContaining('POSTULANTE'),
    ])
    expect(wrapper.find('.access-card__link').attributes('href')).toBe('/registro')
  })

  it('al elegir socio muestra su formulario y permite volver a los roles', async () => {
    await montar()
    await elegirRol(1)
    expect(wrapper.find('h2').text()).toBe('Socio')
    expect(wrapper.find('#login-identifier').attributes('inputmode')).toBe('numeric')
    expect(wrapper.find('.google-falso').exists()).toBe(false)
    await wrapper.find('.login-form__back').trigger('click')
    expect(wrapper.find('.access-card').exists()).toBe(true)
  })

  it('exige BPS o cédula numérica al socio', async () => {
    await montar()
    await elegirRol(1)
    await enviar('abc', 'Clave#123')
    expect(wrapper.text()).toContain('Ingresá tu número de BPS o cédula para continuar.')
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('exige la contraseña', async () => {
    await montar()
    await elegirRol(0)
    expect(wrapper.find('#login-identifier').attributes('inputmode')).toBe('email')
    await enviar('admin@ccisj.org.uy', '   ')
    expect(wrapper.text()).toContain('Ingresá tu contraseña para continuar.')
  })

  it('ingresa como socio limpiando la cédula y redirige con recarga si cambia la ruta', async () => {
    vi.mocked(authService.login).mockResolvedValue(sesion('SOCIO'))
    await montar()
    useGoogleRegistrationStore().save({ registrationToken: 'r', email: 'x@gmail.com', fullName: 'X', fotoUrl: null })
    await elegirRol(1)
    await enviar('1.234.567-8', 'Clave#123')
    expect(authService.login).toHaveBeenCalledWith('SOCIO', '12345678', 'Clave#123')
    expect(router.currentRoute.value.name).toBe('socio-bolsa-empleo')
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(useGoogleRegistrationStore().pending).toBeNull()
    expect(ubicacion.assign).toHaveBeenCalledWith('/socio/bolsa-empleo')
  })

  it('no recarga la página si el navegador ya está en la ruta del rol', async () => {
    vi.mocked(authService.login).mockResolvedValue(sesion('ADMIN'))
    ubicacion.pathname = '/admin'
    await montar()
    await elegirRol(0)
    await enviar('  admin@ccisj.org.uy ', 'Clave#123')
    expect(authService.login).toHaveBeenCalledWith('ADMIN', 'admin@ccisj.org.uy', 'Clave#123')
    expect(router.currentRoute.value.name).toBe('admin-dashboard')
    expect(ubicacion.assign).not.toHaveBeenCalled()
  })

  it('envía al cambio de clave si la contraseña es provisional', async () => {
    vi.mocked(authService.login).mockResolvedValue(sesion('SOCIO', { debeCambiarPassword: true }))
    await montar()
    await elegirRol(1)
    await enviar('12345678', 'Provisional#1')
    expect(router.currentRoute.value.name).toBe('socio-cambiar-clave')
    expect(ubicacion.assign).not.toHaveBeenCalled()
  })

  it('muestra un mensaje claro si las credenciales son incorrectas', async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiRequestError(401, '/auth/login', null, 'Unauthorized'))
    await montar()
    await elegirRol(2)
    await enviar('ana@gmail.com', 'mala')
    expect(wrapper.text()).toContain('Usuario o contraseña incorrectos. Revisá tus datos e intentá nuevamente.')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Ingresar')
  })

  it('el postulante ingresa con Google cuando la cuenta ya existe', async () => {
    vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'LOGIN', session: sesion('POSTULANTE') })
    await montar()
    await elegirRol(2)
    expect(wrapper.find('.login-form__register-link').attributes('href')).toBe('/registro')
    wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
    await flushPromises()
    expect(authService.googleAuthenticate).toHaveBeenCalledWith(credencial)
    expect(router.currentRoute.value.name).toBe('postulante-bolsa-empleo')
    expect(ubicacion.assign).toHaveBeenCalledWith('/postulante/ofertas-empleo')
  })

  it('con Google sin cuenta guarda el registro pendiente y va al registro', async () => {
    const resultado: GoogleAuthResult = { status: 'REGISTER', registrationToken: 'reg', email: 'nuevo@gmail.com', fullName: 'Nuevo', fotoUrl: null }
    vi.mocked(authService.googleAuthenticate).mockResolvedValue(resultado)
    await montar()
    await elegirRol(2)
    wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
    await flushPromises()
    expect(useGoogleRegistrationStore().pending).toMatchObject({ registrationToken: 'reg', email: 'nuevo@gmail.com' })
    expect(router.currentRoute.value.name).toBe('register')
  })

  it('pide la contraseña para vincular Google a una cuenta existente', async () => {
    vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'LINK_REQUIRED', email: 'ana@gmail.com', fullName: 'Ana' })
    vi.mocked(authService.googleLink).mockResolvedValue({ status: 'LOGIN', session: sesion('POSTULANTE') })
    await montar()
    await elegirRol(2)
    wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
    await flushPromises()
    const identificador = wrapper.find<HTMLInputElement>('#login-identifier')
    expect(identificador.element.value).toBe('ana@gmail.com')
    expect(identificador.element.readOnly).toBe(true)
    expect(wrapper.text()).toContain('Este correo ya tiene una cuenta. Confirmá su contraseña para vincularla con Google.')
    await wrapper.find('input#login-password').setValue('Clave#123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(authService.googleLink).toHaveBeenCalledWith(credencial, 'Clave#123')
    expect(authService.login).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('postulante-bolsa-empleo')
  })

  it('informa si la vinculación con Google no termina en un ingreso', async () => {
    vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'LINK_REQUIRED', email: 'ana@gmail.com', fullName: 'Ana' })
    vi.mocked(authService.googleLink).mockResolvedValue({ status: 'LINK_REQUIRED', email: 'ana@gmail.com', fullName: 'Ana' })
    await montar()
    await elegirRol(2)
    wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
    await flushPromises()
    await wrapper.find('input#login-password').setValue('Clave#123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo vincular tu cuenta. Volvé a iniciar sesión con Google.')
  })

  it('al cambiar de rol se descarta la vinculación pendiente con Google', async () => {
    vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'LINK_REQUIRED', email: 'ana@gmail.com', fullName: 'Ana' })
    await montar()
    await elegirRol(2)
    wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
    await flushPromises()
    await wrapper.find('.login-form__back').trigger('click')
    await elegirRol(2)
    const identificador = wrapper.find<HTMLInputElement>('#login-identifier')
    expect(identificador.element.value).toBe('')
    expect(identificador.element.readOnly).toBe(false)
  })

  it('muestra el error si falla el acceso con Google', async () => {
    vi.mocked(authService.googleAuthenticate).mockRejectedValue(new Error('Failed to fetch'))
    await montar()
    await elegirRol(2)
    wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo iniciar sesión con Google: no hay conexión con el servidor.')
    expect(wrapper.find('.google-falso').attributes('data-disabled')).toBe('false')
  })
})
