// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import SocioNotificacionesView from './SocioNotificacionesView.vue'
import { socioNotificationService, type SocioNotificationRecord } from '../../services/socioNotificationService'
import { useAuthStore } from '../../stores/auth'
import { useSocioNotificationsStore } from '../../stores/socioNotifications'

vi.mock('../../services/socioNotificationService', () => ({
  socioNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn(), dismissPopup: vi.fn() },
}))

// El layout real se reemplaza por un contenedor que solo renderiza sus slots.
const SocioShellStub = defineComponent({
  props: { title: String, subtitle: String, activeNav: String },
  setup(props, { slots }) {
    return () => h('div', { class: 'shell', 'data-active': props.activeNav }, [slots['header-actions']?.(), slots.default?.()])
  },
})

function registro(id: number, cambios: Partial<SocioNotificationRecord> = {}): SocioNotificationRecord {
  return { id, titulo: `Comunicado ${id}`, cuerpo: `Texto ${id}`, leida: false, popup: false, createdAt: '2026-04-10T09:00:00Z', comunicadoId: null, ...cambios }
}

function diferido<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((ok) => { resolve = ok })
  return { promise, resolve }
}

describe('listado de notificaciones del socio', () => {
  let pinia: Pinia

  beforeEach(() => {
    sessionStorage.clear()
    document.body.style.overflow = ''
    vi.resetAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setSession({ token: 't', email: 's@ejemplo.test', role: 'SOCIO' })
    vi.mocked(socioNotificationService.markOneRead).mockResolvedValue(registro(1, { leida: true }))
    vi.mocked(socioNotificationService.markAllRead).mockResolvedValue(undefined)
  })

  function montar() {
    return mount(SocioNotificacionesView, { global: { plugins: [pinia], stubs: { SocioShell: SocioShellStub } } })
  }

  it('carga al montar, muestra el estado de carga y luego el listado', async () => {
    const pendiente = diferido<SocioNotificationRecord[]>()
    vi.mocked(socioNotificationService.list).mockReturnValueOnce(pendiente.promise)
    const wrapper = montar()
    await flushPromises()
    expect(wrapper.find('.shell').attributes('data-active')).toBe('notificaciones')
    expect(wrapper.find('.socio-notifications__empty').text()).toBe('Cargando notificaciones...')

    pendiente.resolve([registro(1), registro(2, { leida: true })])
    await flushPromises()
    const tarjetas = wrapper.findAll('.socio-notification-card')
    expect(tarjetas).toHaveLength(2)
    expect(tarjetas[0]!.classes()).toContain('socio-notification-card--unread')
    expect(tarjetas[0]!.find('.socio-notification-card__dot').exists()).toBe(true)
    expect(tarjetas[1]!.classes()).not.toContain('socio-notification-card--unread')
    expect(tarjetas[1]!.find('.socio-notification-card__dot').exists()).toBe(false)
    expect(tarjetas[0]!.find('h2').text()).toBe('Comunicado 1')
    expect(tarjetas[0]!.find('time').text()).not.toBe('')
  })

  it('abre el detalle con click, enter o espacio', async () => {
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1), registro(2), registro(3)])
    const wrapper = montar()
    await flushPromises()
    const store = useSocioNotificationsStore()
    const tarjetas = wrapper.findAll('.socio-notification-card')

    await tarjetas[0]!.trigger('click')
    expect(store.opened?.id).toBe('1')
    store.closeDetail()
    await tarjetas[1]!.trigger('keydown', { key: 'Enter' })
    expect(store.opened?.id).toBe('2')
    store.closeDetail()
    await tarjetas[2]!.trigger('keydown', { key: ' ' })
    expect(store.opened?.id).toBe('3')
    await flushPromises()
    expect(socioNotificationService.markOneRead).toHaveBeenCalledTimes(3)
    expect(wrapper.findAll('.socio-notification-card--unread')).toHaveLength(0)
  })

  it('marca todas como leídas y deshabilita el botón sin pendientes', async () => {
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1), registro(2)])
    const wrapper = montar()
    await flushPromises()
    const boton = wrapper.find('.shell > button')
    expect(boton.text()).toBe('Marcar todo como leído')
    expect(boton.attributes('disabled')).toBeUndefined()
    await boton.trigger('click')
    await flushPromises()
    expect(socioNotificationService.markAllRead).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.socio-notification-card--unread')).toHaveLength(0)
    expect(boton.attributes('disabled')).toBeDefined()
  })

  it('muestra el error y el estado vacío', async () => {
    vi.mocked(socioNotificationService.list).mockRejectedValueOnce(new Error('No se pudo conectar'))
    const wrapper = montar()
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo conectar')
    expect(wrapper.find('.socio-notifications__empty').text()).toBe('No tenés notificaciones por ahora.')
    expect(wrapper.find('.socio-notifications').exists()).toBe(false)
  })
})
