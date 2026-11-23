// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import SocioShell from './SocioShell.vue'
import NotificationBell from '../NotificationBell.vue'
import { authService } from '../../services/authService'
import { socioNotificationService, type SocioNotificationRecord } from '../../services/socioNotificationService'
import { useAuthStore } from '../../stores/auth'
import { useSocioNotificationsStore } from '../../stores/socioNotifications'

vi.mock('../../services/authService', () => ({
  authService: { currentUser: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), uploadProfilePhoto: vi.fn(), removeProfilePhoto: vi.fn() },
}))
vi.mock('../../services/socioNotificationService', () => ({
  socioNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn(), dismissPopup: vi.fn() },
}))

const Vacia = defineComponent({ render: () => h('div') })

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: ['access', 'socio-bolsa-empleo', 'socio-mis-ofertas', 'socio-notificaciones', 'socio-directorio', 'socio-perfil']
      .map((name) => ({ path: `/${name}`, name, component: Vacia })),
  })
}

function registro(id: number, cambios: Partial<SocioNotificationRecord> = {}): SocioNotificationRecord {
  return { id, titulo: `Comunicado ${id}`, cuerpo: `Texto ${id}`, leida: false, popup: false, createdAt: '2026-05-01T12:00:00Z', comunicadoId: null, ...cambios }
}

type Usuario = Awaited<ReturnType<typeof authService.currentUser>>
function usuario(cambios: Partial<Usuario> = {}): Usuario {
  return { fullName: 'Ferretería Central', esDirectivo: false, debeCambiarPassword: false, fotoUrl: null, ...cambios } as Usuario
}

describe('layout del socio', () => {
  let pinia: Pinia
  let router: Router
  let montados: VueWrapper[] = []

  beforeEach(async () => {
    sessionStorage.clear()
    document.body.style.overflow = ''
    pinia = createPinia()
    setActivePinia(pinia)
    vi.resetAllMocks()
    vi.mocked(authService.currentUser).mockResolvedValue(usuario())
    vi.mocked(authService.logout).mockResolvedValue(undefined as never)
    vi.mocked(socioNotificationService.list).mockResolvedValue([])
    vi.mocked(socioNotificationService.markOneRead).mockResolvedValue(registro(1, { leida: true }))
    vi.mocked(socioNotificationService.dismissPopup).mockResolvedValue(undefined)
    router = crearRouter()
    await router.push('/socio-bolsa-empleo')
  })

  afterEach(() => {
    montados.forEach((wrapper) => wrapper.unmount())
    montados = []
  })

  function ingresarSocio() {
    useAuthStore().setSession({ token: 'tok', email: 'socio@ejemplo.test', role: 'SOCIO' })
  }

  async function montar(props: Partial<InstanceType<typeof SocioShell>['$props']> = {}) {
    const wrapper = mount(SocioShell, {
      props: { title: 'Panel', subtitle: 'Resumen', activeNav: 'ofertas', ...props },
      slots: { default: '<p class="contenido">Contenido</p>', 'header-actions': '<button class="accion">Acción</button>', overlay: '<div class="capa" />' },
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    montados.push(wrapper)
    await flushPromises()
    return wrapper
  }

  it('fuera de una sesión de socio no consulta perfil ni notificaciones', async () => {
    const wrapper = await montar({ companyName: 'Empresa Prop', companyRole: '' })
    expect(authService.currentUser).not.toHaveBeenCalled()
    expect(socioNotificationService.list).not.toHaveBeenCalled()
    expect(wrapper.find('.socio-header__title').text()).toBe('Panel')
    expect(wrapper.find('.socio-header__subtitle').text()).toBe('Resumen')
    expect(wrapper.find('.contenido').exists()).toBe(true)
    expect(wrapper.find('.accion').exists()).toBe(true)
    expect(wrapper.find('.capa').exists()).toBe(true)
    expect(wrapper.find('.socio-header__identity strong').text()).toBe('Empresa Prop')
    expect(wrapper.find('.socio-header__identity span').text()).toBe('SOCIO')
    expect(wrapper.find('.socio-header__avatar').text()).toBe('EP')
    expect(wrapper.find('.socio-nav__item--active').text()).toContain('Mis Ofertas')
    expect(wrapper.text()).not.toContain('Directorio de Socios')
  })

  it('sin nombre de empresa usa "Socio" y el rol recibido', async () => {
    const wrapper = await montar({ companyRole: 'SOCIO ADHERENTE' })
    expect(wrapper.find('.socio-header__identity strong').text()).toBe('Socio')
    expect(wrapper.find('.socio-header__identity span').text()).toBe('SOCIO ADHERENTE')
  })

  it('con un nombre en blanco usa la inicial genérica', async () => {
    const wrapper = await montar({ companyName: '   ', companyInitials: 'XY' })
    expect(wrapper.find('.socio-header__avatar').text()).toBe('S')
  })

  it('carga el perfil, las notificaciones y muestra el directorio a directivos', async () => {
    ingresarSocio()
    vi.mocked(authService.currentUser).mockResolvedValue(usuario({ esDirectivo: true }))
    vi.mocked(socioNotificationService.list).mockResolvedValue([registro(1), registro(2), registro(3, { leida: true })])
    const wrapper = await montar({ activeNav: 'directorio' })

    expect(wrapper.find('.socio-header__identity strong').text()).toBe('Ferretería Central')
    expect(wrapper.find('.socio-header__identity span').text()).toBe('SOCIO DIRECTIVO')
    expect(wrapper.find('.socio-header__avatar').text()).toBe('FC')
    expect(wrapper.find('.socio-nav__count').text()).toBe('2')
    expect(wrapper.find('.socio-nav__item--active').text()).toContain('Directorio de Socios')
    expect(wrapper.find('.socio-toast').exists()).toBe(false)
    expect(wrapper.find('.notification-modal').exists()).toBe(false)

    const campana = wrapper.findComponent(NotificationBell)
    expect(campana.props('count')).toBe(2)
    expect(campana.props('items')).toHaveLength(3)
    expect(campana.props('items')[0]).toEqual({ id: '1', title: 'Comunicado 1', body: 'Texto 1', createdAt: '2026-05-01T12:00:00Z', unread: true })

    campana.vm.$emit('refresh')
    await flushPromises()
    expect(socioNotificationService.list).toHaveBeenCalledTimes(2)

    campana.vm.$emit('read', '1')
    await flushPromises()
    expect(socioNotificationService.markOneRead).toHaveBeenCalledWith('1')
    expect(wrapper.find('.socio-nav__count').text()).toBe('1')
  })

  it('informa si no se pudo refrescar el perfil y sigue cargando notificaciones', async () => {
    ingresarSocio()
    vi.mocked(authService.currentUser).mockRejectedValue(new Error('Perfil no disponible'))
    const wrapper = await montar()
    expect(wrapper.find('.socio-shell__body').text()).toContain('Perfil no disponible')
    expect(socioNotificationService.list).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.socio-nav__count').exists()).toBe(false)
  })

  it('abre y cierra el menú lateral desde todos sus controles', async () => {
    const wrapper = await montar()
    const sidebar = wrapper.find('.socio-sidebar')
    const abrir = wrapper.find('.shell-menu-button')

    await abrir.trigger('click')
    expect(sidebar.classes()).toContain('socio-sidebar--open')
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.find('.shell-backdrop').trigger('click')
    expect(sidebar.classes()).not.toContain('socio-sidebar--open')
    expect(document.body.style.overflow).toBe('')

    await abrir.trigger('click')
    await wrapper.find('.shell-sidebar-close').trigger('click')
    expect(wrapper.find('.shell-backdrop').exists()).toBe(false)

    // Cada enlace del menú lo cierra y navega.
    ingresarSocio()
    useAuthStore().setEsDirectivo(true)
    await flushPromises()
    const enlaces = wrapper.findAll('.socio-nav__item')
    expect(enlaces).toHaveLength(5)
    for (const enlace of enlaces) {
      await abrir.trigger('click')
      await enlace.trigger('click')
      await flushPromises()
      expect(sidebar.classes()).not.toContain('socio-sidebar--open')
    }
    expect(router.currentRoute.value.name).toBe('socio-perfil')
  })

  it('cierra el menú al cambiar de ruta', async () => {
    const wrapper = await montar()
    await wrapper.find('.shell-menu-button').trigger('click')
    await router.push('/socio-mis-ofertas')
    await flushPromises()
    expect(wrapper.find('.socio-sidebar').classes()).not.toContain('socio-sidebar--open')
  })

  it('cierra la sesión y vuelve al acceso', async () => {
    ingresarSocio()
    const wrapper = await montar()
    await wrapper.find('.shell-exit').trigger('click')
    await flushPromises()
    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(useAuthStore().token).toBeNull()
    expect(router.currentRoute.value.name).toBe('access')
  })

  it('presenta el comunicado obligatorio y solo lo cierra con sus botones', async () => {
    ingresarSocio()
    vi.mocked(socioNotificationService.list).mockResolvedValue([registro(1, { popup: true })])
    const wrapper = await montar()
    const modal = wrapper.find('.notification-modal')
    expect(modal.classes()).toContain('notification-modal--blocking')
    expect(modal.attributes('aria-labelledby')).toBe('notification-modal-title-1')
    expect(wrapper.find('.notification-modal__eyebrow').text()).toBe('Comunicado obligatorio')
    expect(wrapper.find('.notification-modal time').exists()).toBe(true)
    expect(wrapper.find('.notification-modal__body').text()).toBe('Texto 1')
    expect(wrapper.find('.socio-toast').exists()).toBe(false)

    await modal.trigger('keydown', { key: 'Escape' })
    await modal.trigger('keydown', { key: 'Enter' })
    await modal.trigger('click')
    expect(wrapper.find('.notification-modal').exists()).toBe(true)

    await wrapper.find('.notification-modal__done').trigger('click')
    await flushPromises()
    expect(wrapper.find('.notification-modal').exists()).toBe(false)
    expect(socioNotificationService.markOneRead).toHaveBeenCalledWith('1')
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)
  })

  it('muestra el aviso flotante, abre su detalle y lo cierra con escape, fondo o botones', async () => {
    ingresarSocio()
    const notificaciones = useSocioNotificationsStore()
    // El aviso flotante aparece cuando ya no hay pop-up bloqueante en pantalla.
    vi.mocked(socioNotificationService.list).mockResolvedValue([registro(1, { popup: true, createdAt: null })])
    const wrapper = await montar()
    await wrapper.find('.notification-modal__close').trigger('click')
    await flushPromises()
    vi.mocked(socioNotificationService.list).mockResolvedValue([registro(1, { popup: true, createdAt: null })])
    await notificaciones.load()
    await flushPromises()

    const aviso = wrapper.find('.socio-toast')
    expect(aviso.find('strong').text()).toBe('Comunicado 1')
    expect(aviso.find('p').text()).toBe('Texto 1')
    await aviso.find('.socio-toast__open').trigger('click')
    await flushPromises()
    expect(wrapper.find('.socio-toast').exists()).toBe(false)
    const modal = wrapper.find('.notification-modal')
    expect(modal.classes()).not.toContain('notification-modal--blocking')
    expect(wrapper.find('.notification-modal__eyebrow').text()).toBe('Comunicado CCISJ')
    expect(wrapper.find('.notification-modal time').exists()).toBe(false)

    // Otras teclas no lo cierran; escape sí.
    await modal.trigger('keydown', { key: 'a' })
    expect(wrapper.find('.notification-modal').exists()).toBe(true)
    await modal.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.notification-modal').exists()).toBe(false)

    await notificaciones.openDetail(notificaciones.items[0]!)
    await flushPromises()
    // Un click dentro del panel no cierra; sobre el fondo sí.
    await wrapper.find('.notification-modal__panel').trigger('click')
    expect(wrapper.find('.notification-modal').exists()).toBe(true)
    await wrapper.find('.notification-modal').trigger('click')
    expect(wrapper.find('.notification-modal').exists()).toBe(false)

    await notificaciones.openDetail(notificaciones.items[0]!)
    await flushPromises()
    await wrapper.find('.notification-modal__done').trigger('click')
    expect(wrapper.find('.notification-modal').exists()).toBe(false)
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)
  })

  it('descarta el aviso flotante con su cruz', async () => {
    ingresarSocio()
    const notificaciones = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValue([registro(1, { popup: true })])
    const wrapper = await montar()
    await wrapper.find('.notification-modal__close').trigger('click')
    await flushPromises()
    await notificaciones.load()
    await flushPromises()

    await wrapper.find('.socio-toast__close').trigger('click')
    await flushPromises()
    expect(wrapper.find('.socio-toast').exists()).toBe(false)
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(2)
  })
})
