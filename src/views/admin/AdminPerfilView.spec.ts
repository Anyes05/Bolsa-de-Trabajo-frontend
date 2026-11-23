// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import AdminPerfilView from './AdminPerfilView.vue'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'
import type { AuthResponse } from '../../services/types'

vi.mock('../../services/authService', () => ({
  authService: {
    changePassword: vi.fn(),
    currentUser: vi.fn(),
    uploadProfilePhoto: vi.fn(),
    removeProfilePhoto: vi.fn(),
    logout: vi.fn(),
  },
}))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

const Vacia = defineComponent({ render: () => h('div') })

const CLAVE_ACTUAL = 'Actual#2025'
const CLAVE_NUEVA = 'Nueva#2026x'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

type Contexto = { router: Router; auth: ReturnType<typeof useAuthStore> }

async function preparar(): Promise<Contexto> {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.role = 'ADMIN'
  auth.email = 'admin@ccisj.test'
  auth.fullName = 'Laura Gómez'
  auth.uploadPhoto = vi.fn().mockResolvedValue(undefined)
  auth.removePhoto = vi.fn().mockResolvedValue(undefined)
  auth.logout = vi.fn().mockResolvedValue(undefined)
  auth.setSession = vi.fn()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'access', component: Vacia },
      { path: '/admin/perfil', component: Vacia },
    ],
  })
  await router.push('/admin/perfil')
  await router.isReady()
  return { router, auth }
}

function montar({ router }: Contexto) {
  return mount(AdminPerfilView, {
    global: { plugins: [router], stubs: { AdminShell: AdminShellStub } },
  })
}

function archivo(nombre: string, tipo: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo })
}

async function elegirFoto(wrapper: ReturnType<typeof montar>, archivos: File[], indice = 0) {
  const input = wrapper.findAll('input[type="file"]')[indice]!
  Object.defineProperty(input.element, 'files', { value: archivos, configurable: true })
  await input.trigger('change')
}

async function completarClaves(wrapper: ReturnType<typeof montar>, actual: string, nueva: string, repetir: string) {
  await wrapper.find('#admin-current-password').setValue(actual)
  await wrapper.find('#admin-new-password').setValue(nueva)
  await wrapper.find('#admin-repeat-password').setValue(repetir)
}

describe('perfil del administrador', () => {
  beforeEach(() => {
    vi.mocked(authService.changePassword).mockReset()
  })

  afterEach(() => vi.restoreAllMocks())

  it('muestra los datos de la cuenta con iniciales cuando no hay foto', async () => {
    const contexto = await preparar()
    const wrapper = montar(contexto)

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe('perfil')
    expect(wrapper.find('.socio-profile__identity h2').text()).toBe('Laura Gómez')
    expect(wrapper.find('.socio-profile__avatar').text()).toContain('LG')
    expect(wrapper.find('.socio-profile__avatar img').exists()).toBe(false)
    expect(wrapper.find('.socio-profile__photo-clear').exists()).toBe(false)
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('admin@ccisj.test')
  })

  it('usa "Administrador" y "AD" cuando no hay nombre ni correo', async () => {
    const contexto = await preparar()
    contexto.auth.fullName = null
    contexto.auth.email = null
    const wrapper = montar(contexto)

    expect(wrapper.find('.socio-profile__identity h2').text()).toBe('Administrador')
    expect(wrapper.find('.socio-profile__avatar').text()).toContain('A')
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('')

    contexto.auth.fullName = '  '
    await nextTick()
    expect(wrapper.find('.socio-profile__avatar').text()).toContain('AD')
  })

  it('muestra la foto y permite quitarla', async () => {
    const contexto = await preparar()
    contexto.auth.photoUrl = 'https://cdn.test/foto.png'
    const quitar = deferred<void>()
    contexto.auth.removePhoto = vi.fn().mockReturnValue(quitar.promise)
    const wrapper = montar(contexto)

    expect(wrapper.find('.socio-profile__avatar img').attributes('src')).toBe('https://cdn.test/foto.png')
    await wrapper.find('.socio-profile__photo-clear').trigger('click')
    expect(wrapper.find('.socio-profile__photo-button').text()).toContain('Actualizando foto...')
    expect(wrapper.find('.socio-profile__photo-clear').attributes('disabled')).toBeDefined()

    // Mientras se procesa, un segundo clic no vuelve a llamar al store.
    await wrapper.find('.socio-profile__photo-clear').element.dispatchEvent(new Event('click'))
    expect(contexto.auth.removePhoto).toHaveBeenCalledTimes(1)

    quitar.resolve()
    await flushPromises()
    expect(wrapper.text()).toContain('Tu foto de perfil se eliminó correctamente.')
    expect(wrapper.find('.socio-profile__photo-button').text()).toContain('Cambiar foto')
  })

  it('muestra el error si no se puede quitar la foto', async () => {
    const contexto = await preparar()
    contexto.auth.photoUrl = 'https://cdn.test/foto.png'
    contexto.auth.removePhoto = vi.fn().mockRejectedValue(new Error('No se pudo borrar'))
    const wrapper = montar(contexto)

    await wrapper.find('.socio-profile__photo-clear').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo borrar')
  })

  it('sube una foto válida desde cualquiera de los dos selectores', async () => {
    const contexto = await preparar()
    const wrapper = montar(contexto)
    const foto = archivo('foto.webp', 'image/webp')

    await elegirFoto(wrapper, [foto], 1)
    await flushPromises()
    expect(contexto.auth.uploadPhoto).toHaveBeenCalledWith(foto)
    expect(wrapper.text()).toContain('Tu foto de perfil se actualizó correctamente.')

    await elegirFoto(wrapper, [archivo('otra.jpg', 'image/jpeg')], 0)
    await flushPromises()
    expect(contexto.auth.uploadPhoto).toHaveBeenCalledTimes(2)
  })

  it('no hace nada si no se eligió archivo o ya hay una subida en curso', async () => {
    const contexto = await preparar()
    const subida = deferred<void>()
    contexto.auth.uploadPhoto = vi.fn().mockReturnValue(subida.promise)
    const wrapper = montar(contexto)

    await elegirFoto(wrapper, [])
    expect(contexto.auth.uploadPhoto).not.toHaveBeenCalled()

    await elegirFoto(wrapper, [archivo('foto.png', 'image/png')])
    expect(contexto.auth.uploadPhoto).toHaveBeenCalledTimes(1)
    // El input queda deshabilitado, pero el handler también protege una segunda subida.
    const input = wrapper.findAll('input[type="file"]')[1]!
    Object.defineProperty(input.element, 'files', { value: [archivo('dos.png', 'image/png')], configurable: true })
    input.element.dispatchEvent(new Event('change'))
    await nextTick()
    expect(contexto.auth.uploadPhoto).toHaveBeenCalledTimes(1)

    subida.resolve()
    await flushPromises()
  })

  it('rechaza formatos no permitidos', async () => {
    const contexto = await preparar()
    const wrapper = montar(contexto)

    await elegirFoto(wrapper, [archivo('foto.gif', 'image/gif')])
    expect(wrapper.text()).toContain('Seleccioná una imagen JPG, PNG o WEBP.')
    expect(contexto.auth.uploadPhoto).not.toHaveBeenCalled()
  })

  it.each([
    ['vacía', 0],
    ['mayor a 5 MB', 5 * 1024 * 1024 + 1],
  ])('rechaza una imagen %s', async (_caso, bytes) => {
    const contexto = await preparar()
    const wrapper = montar(contexto)

    await elegirFoto(wrapper, [archivo('foto.png', 'image/png', bytes)])
    expect(wrapper.text()).toContain('La imagen no puede estar vacía y debe pesar hasta 5 MB.')
    expect(contexto.auth.uploadPhoto).not.toHaveBeenCalled()
  })

  it('muestra el error si la subida falla', async () => {
    const contexto = await preparar()
    contexto.auth.uploadPhoto = vi.fn().mockRejectedValue(new Error('Almacenamiento lleno'))
    const wrapper = montar(contexto)

    await elegirFoto(wrapper, [archivo('foto.png', 'image/png')])
    await flushPromises()
    expect(wrapper.text()).toContain('Almacenamiento lleno')
  })

  it('habilita el cambio de contraseña solo con datos válidos y avisa si no coinciden', async () => {
    const contexto = await preparar()
    const wrapper = montar(contexto)
    const boton = () => wrapper.find('button[type="submit"]')

    expect(boton().attributes('disabled')).toBeDefined()
    await completarClaves(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, 'Otra#2026x')
    expect(wrapper.text()).toContain('Las contraseñas no coinciden.')
    expect(boton().attributes('disabled')).toBeDefined()

    await completarClaves(wrapper, CLAVE_NUEVA, CLAVE_NUEVA, CLAVE_NUEVA)
    expect(boton().attributes('disabled')).toBeDefined()

    await completarClaves(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, CLAVE_NUEVA)
    expect(wrapper.text()).not.toContain('Las contraseñas no coinciden.')
    expect(boton().attributes('disabled')).toBeUndefined()
  })

  it('valida el formulario si se envía con datos incompletos', async () => {
    const contexto = await preparar()
    const wrapper = montar(contexto)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Completá la contraseña actual y una nueva válida')
    expect(authService.changePassword).not.toHaveBeenCalled()
  })

  it('actualiza la contraseña, renueva la sesión y limpia el formulario', async () => {
    const contexto = await preparar()
    const sesion = { token: 'nuevo', email: 'admin@ccisj.test', role: 'ADMIN' } as AuthResponse
    const cambio = deferred<AuthResponse>()
    vi.mocked(authService.changePassword).mockReturnValueOnce(cambio.promise)
    const wrapper = montar(contexto)

    await completarClaves(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, CLAVE_NUEVA)
    await wrapper.find('form').trigger('submit')
    expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: CLAVE_ACTUAL, newPassword: CLAVE_NUEVA })
    expect(wrapper.find('button[type="submit"]').text()).toBe('Actualizando...')

    // Un segundo envío mientras se procesa queda ignorado.
    await wrapper.find('form').trigger('submit')
    expect(authService.changePassword).toHaveBeenCalledTimes(1)

    cambio.resolve(sesion)
    await flushPromises()
    expect(contexto.auth.setSession).toHaveBeenCalledWith(sesion)
    expect(wrapper.text()).toContain('Tu contraseña se actualizó correctamente.')
    expect((wrapper.find('#admin-current-password').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#admin-new-password').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#admin-repeat-password').element as HTMLInputElement).value).toBe('')
  })

  it('muestra el error si el cambio de contraseña falla', async () => {
    const contexto = await preparar()
    vi.mocked(authService.changePassword).mockRejectedValueOnce(new Error('La contraseña actual no es correcta'))
    const wrapper = montar(contexto)

    await completarClaves(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, CLAVE_NUEVA)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('La contraseña actual no es correcta')
    expect(contexto.auth.setSession).not.toHaveBeenCalled()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Actualizar contraseña')
  })

  it('cierra la sesión y vuelve al acceso', async () => {
    const contexto = await preparar()
    const wrapper = montar(contexto)

    await wrapper.find('.socio-profile__logout-button').trigger('click')
    await flushPromises()
    expect(contexto.auth.logout).toHaveBeenCalledTimes(1)
    expect(contexto.router.currentRoute.value.name).toBe('access')
  })
})
