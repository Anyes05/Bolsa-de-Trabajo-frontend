// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import AdminShell from './AdminShell.vue'
import { useAuthStore } from '../../stores/auth'

// Nunca se llama al backend real: el servicio de autenticación queda mockeado.
vi.mock('../../services/authService', () => ({
  authService: {
    currentUser: vi.fn(),
    uploadProfilePhoto: vi.fn(),
    removeProfilePhoto: vi.fn(),
    logout: vi.fn(),
  },
}))

const Vacia = defineComponent({ render: () => h('div') })

const rutas = [
  '/admin', '/admin/socios', '/admin/socios/importacion', '/admin/caja/importar-historial', '/admin/socios/historial', '/admin/rubros',
  '/admin/postulantes', '/admin/ofertas', '/admin/configuracion', '/admin/comunicados', '/admin/perfil',
]

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'access', component: Vacia },
      ...rutas.map((path) => ({ path, component: Vacia })),
    ],
  })
}

type Montaje = {
  router: Router
  auth: ReturnType<typeof useAuthStore>
}

async function preparar(rol: 'ADMIN' | 'SOCIO' | null = 'ADMIN'): Promise<Montaje> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.role = rol
  auth.email = 'admin@ccisj.test'
  auth.fullName = 'Laura Gómez'
  auth.refreshCurrentUser = vi.fn().mockResolvedValue(undefined)
  auth.uploadPhoto = vi.fn().mockResolvedValue(undefined)
  auth.logout = vi.fn().mockResolvedValue(undefined)
  const router = crearRouter()
  await router.push('/admin/rubros')
  await router.isReady()
  return { router, auth }
}

function montar({ router }: Montaje, props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AdminShell, {
    props: { title: 'Gestión de Rubros', subtitle: 'Catálogo de rubros', active: 'rubros', ...props },
    slots,
    global: { plugins: [router] },
  })
}

function elegirArchivo(input: HTMLInputElement, archivos: File[]) {
  Object.defineProperty(input, 'files', { value: archivos, configurable: true })
}

describe('layout administrativo', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra el título, subtítulo, slots y marca el enlace activo', async () => {
    const montaje = await preparar()
    const wrapper = montar(montaje, {}, {
      default: '<p class="contenido">Contenido de prueba</p>',
      'header-actions': '<button class="accion">Acción</button>',
    })
    await flushPromises()

    expect(wrapper.find('.admin-breadcrumb b').text()).toBe('Gestión de Rubros')
    expect(wrapper.find('.admin-page__heading h1').text()).toBe('Gestión de Rubros')
    expect(wrapper.find('.admin-page__heading p:not(.admin-page__eyebrow)').text()).toBe('Catálogo de rubros')
    expect(wrapper.find('.contenido').exists()).toBe(true)
    expect(wrapper.find('.accion').exists()).toBe(true)
    const enlaces = wrapper.findAll('.admin-nav__item')
    expect(enlaces).toHaveLength(11)
    expect(enlaces.map((enlace) => enlace.text())).toContain('Importar historial')
    const activos = wrapper.findAll('.admin-nav__item--active')
    expect(activos).toHaveLength(1)
    expect(activos[0]!.text()).toBe('Rubros')
    expect(wrapper.find('.admin-topbar__identity strong').text()).toBe('Laura Gómez')
    expect(wrapper.find('.admin-topbar__identity span').text()).toBe('ADMIN')
    expect(wrapper.find('.profile-avatar').text()).toBe('LG')
    expect(montaje.auth.refreshCurrentUser).toHaveBeenCalledTimes(1)
  })

  it('usa los valores por defecto cuando no se pasan props', async () => {
    const montaje = await preparar()
    const wrapper = mount(AdminShell, { global: { plugins: [montaje.router] } })
    await flushPromises()

    expect(wrapper.find('.admin-page__heading h1').text()).toBe('Panel de administración')
    expect(wrapper.text()).toContain('Gestiona la plataforma CCISJ')
    expect(wrapper.find('.admin-nav__item--active').text()).toBe('Control de Caja')
  })

  it('cae al email o a "Administrador" cuando falta el nombre', async () => {
    const montaje = await preparar()
    montaje.auth.fullName = null
    const wrapper = montar(montaje)
    await flushPromises()
    expect(wrapper.find('.admin-topbar__identity strong').text()).toBe('admin@ccisj.test')
    expect(wrapper.find('.profile-avatar').text()).toBe('A')

    montaje.auth.email = null
    await nextTick()
    expect(wrapper.find('.admin-topbar__identity strong').text()).toBe('Administrador')
    expect(wrapper.find('.profile-avatar').text()).toBe('A')
  })

  it('usa "AD" como iniciales cuando el nombre no tiene letras visibles', async () => {
    const montaje = await preparar()
    montaje.auth.fullName = '   '
    const wrapper = montar(montaje)
    await flushPromises()
    expect(wrapper.find('.profile-avatar').text()).toBe('AD')
  })

  it('no refresca el perfil si el usuario no es administrador y muestra ADMIN por defecto', async () => {
    const montaje = await preparar(null)
    const wrapper = montar(montaje)
    await flushPromises()

    expect(montaje.auth.refreshCurrentUser).not.toHaveBeenCalled()
    expect(wrapper.find('.admin-topbar__identity span').text()).toBe('ADMIN')
  })

  it('muestra un error si no se puede refrescar el perfil', async () => {
    const montaje = await preparar()
    montaje.auth.refreshCurrentUser = vi.fn().mockRejectedValue(new Error('Perfil no disponible'))
    const wrapper = montar(montaje)
    await flushPromises()

    expect(wrapper.find('.admin-page').text()).toContain('Perfil no disponible')
  })

  it('abre y cierra el menú lateral bloqueando el scroll del documento', async () => {
    const montaje = await preparar()
    const wrapper = montar(montaje)
    await flushPromises()

    await wrapper.find('.admin-menu-button').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).toContain('admin-sidebar--open')
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.find('.admin-shell__backdrop').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('admin-sidebar--open')
    expect(wrapper.find('.admin-shell__backdrop').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')

    await wrapper.find('.admin-menu-button').trigger('click')
    await wrapper.find('.admin-sidebar__close').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('admin-sidebar--open')

    await wrapper.find('.admin-menu-button').trigger('click')
    await wrapper.findAll('.admin-nav__item')[1]!.trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('admin-sidebar--open')
  })

  it('cierra el menú cuando cambia la ruta', async () => {
    const montaje = await preparar()
    const wrapper = montar(montaje)
    await flushPromises()

    await wrapper.find('.admin-menu-button').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).toContain('admin-sidebar--open')
    await montaje.router.push('/admin/ofertas')
    await flushPromises()
    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('admin-sidebar--open')
  })

  it('sube una nueva foto de perfil y avisa el resultado', async () => {
    const montaje = await preparar()
    let terminar!: () => void
    montaje.auth.uploadPhoto = vi.fn().mockReturnValue(new Promise<void>((resolve) => { terminar = resolve }))
    const wrapper = montar(montaje)
    await flushPromises()
    const input = wrapper.find('input[type="file"]')
    const archivo = new File(['foto'], 'foto.png', { type: 'image/png' })
    elegirArchivo(input.element as HTMLInputElement, [archivo])

    await input.trigger('change')
    expect(montaje.auth.uploadPhoto).toHaveBeenCalledWith(archivo)
    expect(input.attributes('disabled')).toBeDefined()

    terminar()
    await flushPromises()
    expect(wrapper.text()).toContain('Tu foto de perfil se actualizó correctamente.')
    expect(input.attributes('disabled')).toBeUndefined()
  })

  it('ignora el cambio de archivo cuando no se seleccionó ninguno', async () => {
    const montaje = await preparar()
    const wrapper = montar(montaje)
    await flushPromises()
    const input = wrapper.find('input[type="file"]')
    elegirArchivo(input.element as HTMLInputElement, [])

    await input.trigger('change')
    expect(montaje.auth.uploadPhoto).not.toHaveBeenCalled()
  })

  it('muestra el error si la foto no se puede subir', async () => {
    const montaje = await preparar()
    montaje.auth.uploadPhoto = vi.fn().mockRejectedValue(new Error('Imagen demasiado grande'))
    const wrapper = montar(montaje)
    await flushPromises()
    const input = wrapper.find('input[type="file"]')
    elegirArchivo(input.element as HTMLInputElement, [new File(['x'], 'x.png', { type: 'image/png' })])

    await input.trigger('change')
    await flushPromises()
    expect(wrapper.text()).toContain('Imagen demasiado grande')
    expect(wrapper.text()).not.toContain('Tu foto de perfil se actualizó correctamente.')
  })

  it('cierra la sesión y navega al acceso', async () => {
    const montaje = await preparar()
    const wrapper = montar(montaje)
    await flushPromises()

    await wrapper.find('.shell-exit').trigger('click')
    await flushPromises()
    expect(montaje.auth.logout).toHaveBeenCalledTimes(1)
    expect(montaje.router.currentRoute.value.name).toBe('access')
  })
})
