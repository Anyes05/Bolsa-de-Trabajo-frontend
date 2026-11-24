// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import PostulanteShell from './PostulanteShell.vue'
import NotificationBell from '../NotificationBell.vue'
import { authService } from '../../services/authService'
import { permanenciaService, type PermanenciaEstado } from '../../services/permanenciaService'
import { postulanteNotificationService } from '../../services/postulanteNotificationService'
import type { SocioNotificationRecord } from '../../services/socioNotificationService'
import { useAuthStore } from '../../stores/auth'

vi.mock('../../services/authService', () => ({
  authService: { currentUser: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), uploadProfilePhoto: vi.fn(), removeProfilePhoto: vi.fn() },
}))
vi.mock('../../services/postulanteNotificationService', () => ({
  postulanteNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn() },
}))
vi.mock('../../services/permanenciaService', () => ({
  permanenciaService: { estado: vi.fn(), confirmarAutenticado: vi.fn(), confirmarPorToken: vi.fn() },
}))

const Vacia = defineComponent({ render: () => h('div') })

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'access', component: Vacia },
      { path: '/postulante/ofertas-empleo', name: 'postulante-ofertas', component: Vacia },
      { path: '/postulante/mis-perfiles', name: 'postulante-perfiles', component: Vacia },
      { path: '/postulante/mi-perfil', name: 'postulante-mi-perfil', component: Vacia },
      { path: '/postulante/notificaciones', name: 'postulante-notificaciones', component: Vacia },
    ],
  })
}

function registro(id: number, cambios: Partial<SocioNotificationRecord> = {}): SocioNotificationRecord {
  return { id, titulo: `Aviso ${id}`, cuerpo: `Texto ${id}`, leida: false, popup: false, createdAt: '2026-05-01T12:00:00Z', comunicadoId: null, ...cambios }
}

const sinAccion: PermanenciaEstado = { requiereAccion: false, avisoPendiente: false, ocultoPorRetencion: false, deadline: null }

type Usuario = Awaited<ReturnType<typeof authService.currentUser>>

describe('layout del postulante', () => {
  let pinia: Pinia
  let router: Router
  let montados: VueWrapper[] = []

  beforeEach(async () => {
    sessionStorage.clear()
    document.body.style.overflow = ''
    pinia = createPinia()
    setActivePinia(pinia)
    vi.resetAllMocks()
    vi.mocked(authService.currentUser).mockResolvedValue({ fullName: 'Ana Pérez', esDirectivo: false, debeCambiarPassword: false, fotoUrl: null } as Usuario)
    vi.mocked(authService.logout).mockResolvedValue(undefined as never)
    vi.mocked(postulanteNotificationService.list).mockResolvedValue([])
    vi.mocked(permanenciaService.estado).mockResolvedValue(sinAccion)
    router = crearRouter()
    await router.push('/postulante/ofertas-empleo')
  })

  afterEach(() => {
    montados.forEach((wrapper) => wrapper.unmount())
    montados = []
  })

  function ingresarPostulante() {
    useAuthStore().setSession({ token: 'tok', email: 'ana@ejemplo.test', role: 'POSTULANTE' })
  }

  async function montar(activeSection: 'ofertas' | 'perfiles' | 'mi-perfil' | 'notificaciones' = 'ofertas') {
    const wrapper = mount(PostulanteShell, {
      props: { title: 'Ofertas', subtitle: 'Buscá tu próximo empleo', activeSection },
      slots: { default: '<p class="contenido">Contenido</p>' },
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    montados.push(wrapper)
    await flushPromises()
    return wrapper
  }

  it('fuera de una sesión de postulante no consulta nada y usa valores genéricos', async () => {
    const wrapper = await montar('perfiles')
    expect(authService.currentUser).not.toHaveBeenCalled()
    expect(postulanteNotificationService.list).not.toHaveBeenCalled()
    expect(permanenciaService.estado).not.toHaveBeenCalled()
    expect(wrapper.find('.postulante-header__title').text()).toBe('Ofertas')
    expect(wrapper.find('.postulante-header__subtitle').text()).toBe('Buscá tu próximo empleo')
    expect(wrapper.find('.contenido').exists()).toBe(true)
    expect(wrapper.find('.postulante-header__identity-strong').text()).toBe('Postulante')
    expect(wrapper.find('.postulante-header__identity-inline').text()).toBe('POSTULANTE')
    expect(wrapper.find('.postulante-header__avatar').text()).toBe('P')
    expect(wrapper.find('.postulante-nav__item--active').text()).toContain('Mis Perfiles Profesionales')
    expect(wrapper.find('.permanencia-banner').exists()).toBe(false)
  })

  it('carga perfil, notificaciones y permanencia, y conecta la campana', async () => {
    ingresarPostulante()
    vi.mocked(postulanteNotificationService.list).mockResolvedValue([registro(1), registro(2, { leida: true })])
    vi.mocked(postulanteNotificationService.markOneRead).mockResolvedValue(registro(1, { leida: true }))
    const wrapper = await montar('notificaciones')

    expect(wrapper.find('.postulante-header__identity-strong').text()).toBe('Ana Pérez')
    expect(wrapper.find('.postulante-header__identity-inline').text()).toBe('POSTULANTE')
    expect(wrapper.find('.postulante-header__avatar').text()).toBe('AP')
    expect(wrapper.find('.postulante-nav__item--active').text()).toContain('Notificaciones')

    const campana = wrapper.findComponent(NotificationBell)
    expect(campana.props('count')).toBe(1)
    expect(campana.props('items')[0]).toEqual({ id: '1', title: 'Aviso 1', body: 'Texto 1', createdAt: '2026-05-01T12:00:00Z', unread: true })
    expect(campana.props('items')[1].unread).toBe(false)

    campana.vm.$emit('refresh')
    await flushPromises()
    expect(postulanteNotificationService.list).toHaveBeenCalledTimes(2)

    campana.vm.$emit('read', '1')
    await flushPromises()
    expect(postulanteNotificationService.markOneRead).toHaveBeenCalledWith(1)
    expect(wrapper.findComponent(NotificationBell).props('count')).toBe(0)
  })

  it('sin nombre usa el correo para el saludo y las iniciales', async () => {
    ingresarPostulante()
    vi.mocked(authService.currentUser).mockResolvedValue({ fullName: '', esDirectivo: false, debeCambiarPassword: false, fotoUrl: null } as Usuario)
    const wrapper = await montar('mi-perfil')
    expect(wrapper.find('.postulante-header__identity-strong').text()).toBe('ana@ejemplo.test')
    expect(wrapper.find('.postulante-header__avatar').text()).toBe('A')
    expect(wrapper.find('.postulante-nav__item--active').text()).toContain('Mi perfil')
  })

  it('con un nombre y un correo en blanco usa la inicial genérica', async () => {
    useAuthStore().setSession({ token: 'tok', email: '   ', role: 'POSTULANTE' })
    vi.mocked(authService.currentUser).mockResolvedValue({ fullName: '   ', esDirectivo: false, debeCambiarPassword: false, fotoUrl: null } as Usuario)
    const wrapper = await montar()
    expect(wrapper.find('.postulante-header__avatar').text()).toBe('P')
  })

  it('informa si no pudo refrescar el perfil y sigue con la permanencia', async () => {
    ingresarPostulante()
    vi.mocked(authService.currentUser).mockRejectedValue(new Error('Perfil no disponible'))
    const wrapper = await montar()
    expect(wrapper.find('.postulante-shell__body').text()).toContain('Perfil no disponible')
    expect(permanenciaService.estado).toHaveBeenCalledTimes(1)
  })

  it('informa si no pudo cargar el estado de permanencia', async () => {
    ingresarPostulante()
    vi.mocked(permanenciaService.estado).mockRejectedValue(new Error('Permanencia no disponible'))
    const wrapper = await montar()
    expect(wrapper.find('.postulante-shell__body').text()).toContain('Permanencia no disponible')
    expect(wrapper.find('.permanencia-banner').exists()).toBe(false)
  })

  it('muestra el error de notificaciones del store', async () => {
    ingresarPostulante()
    vi.mocked(postulanteNotificationService.list).mockRejectedValue(new Error('Sin notificaciones'))
    const wrapper = await montar()
    expect(wrapper.find('.postulante-shell__body').text()).toContain('Sin notificaciones')
  })

  it('pide confirmar la permanencia con fecha límite y la confirma', async () => {
    ingresarPostulante()
    vi.mocked(permanenciaService.estado).mockResolvedValue({ requiereAccion: true, avisoPendiente: true, ocultoPorRetencion: false, deadline: '2026-12-10T12:00:00Z' })
    let resolver: (estado: PermanenciaEstado) => void = () => {}
    vi.mocked(permanenciaService.confirmarAutenticado).mockReturnValue(new Promise((resolve) => { resolver = resolve }))
    const wrapper = await montar()

    const banner = wrapper.find('.permanencia-banner')
    expect(banner.text()).toContain('Confirmá tu permanencia en la Bolsa')
    expect(banner.text()).toContain(`Tenés tiempo hasta el ${new Date('2026-12-10T12:00:00Z').toLocaleDateString('es-UY')}`)
    expect(banner.text()).not.toContain('Tu perfil está oculto')

    const boton = banner.find('button')
    await boton.trigger('click')
    expect(boton.attributes('disabled')).toBeDefined()
    resolver(sinAccion)
    await flushPromises()
    expect(permanenciaService.confirmarAutenticado).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.permanencia-banner').exists()).toBe(false)
  })

  it('avisa que el perfil está oculto y muestra el error si la confirmación falla', async () => {
    ingresarPostulante()
    vi.mocked(permanenciaService.estado).mockResolvedValue({ requiereAccion: true, avisoPendiente: false, ocultoPorRetencion: true, deadline: null })
    vi.mocked(permanenciaService.confirmarAutenticado).mockRejectedValue(new Error('No se pudo confirmar'))
    const wrapper = await montar()

    const banner = wrapper.find('.permanencia-banner')
    expect(banner.text()).toContain('Tu perfil está oculto para las empresas hasta que confirmes.')
    expect(banner.text()).not.toContain('Tenés tiempo hasta el')
    await banner.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.postulante-shell__body').text()).toContain('No se pudo confirmar')
    expect(wrapper.find('.permanencia-banner button').attributes('disabled')).toBeUndefined()
  })

  it('con aviso pendiente pero sin fecha y sin ocultar solo muestra el texto base', async () => {
    ingresarPostulante()
    vi.mocked(permanenciaService.estado).mockResolvedValue({ requiereAccion: true, avisoPendiente: true, ocultoPorRetencion: false, deadline: null })
    const wrapper = await montar()
    const texto = wrapper.find('.permanencia-banner__text').text()
    expect(texto).toBe('Llevás más de 2 meses sin actividad.')
  })

  it('abre y cierra el menú lateral desde todos sus controles', async () => {
    const wrapper = await montar()
    const sidebar = wrapper.find('.postulante-sidebar')
    const abrir = wrapper.find('.shell-menu-button')

    await abrir.trigger('click')
    expect(sidebar.classes()).toContain('postulante-sidebar--open')
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.find('.shell-backdrop').trigger('click')
    expect(sidebar.classes()).not.toContain('postulante-sidebar--open')
    expect(document.body.style.overflow).toBe('')

    await abrir.trigger('click')
    await wrapper.find('.shell-sidebar-close').trigger('click')
    expect(wrapper.find('.shell-backdrop').exists()).toBe(false)

    const enlaces = wrapper.findAll('.postulante-nav__item')
    expect(enlaces).toHaveLength(4)
    for (const enlace of enlaces) {
      await abrir.trigger('click')
      await enlace.trigger('click')
      await flushPromises()
      expect(sidebar.classes()).not.toContain('postulante-sidebar--open')
    }
    expect(router.currentRoute.value.name).toBe('postulante-notificaciones')
  })

  it('cierra el menú al cambiar de ruta', async () => {
    const wrapper = await montar()
    await wrapper.find('.shell-menu-button').trigger('click')
    await router.push('/postulante/mi-perfil')
    await flushPromises()
    expect(wrapper.find('.postulante-sidebar').classes()).not.toContain('postulante-sidebar--open')
  })

  it('cierra la sesión y vuelve al acceso', async () => {
    ingresarPostulante()
    const wrapper = await montar()
    await wrapper.find('.shell-exit').trigger('click')
    await flushPromises()
    expect(useAuthStore().token).toBeNull()
    expect(router.currentRoute.value.name).toBe('access')
  })
})
