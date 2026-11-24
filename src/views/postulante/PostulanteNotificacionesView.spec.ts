// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import PostulanteNotificacionesView from './PostulanteNotificacionesView.vue'
import { postulanteNotificationService } from '../../services/postulanteNotificationService'
import type { SocioNotificationRecord } from '../../services/socioNotificationService'
import { useAuthStore } from '../../stores/auth'

vi.mock('../../services/postulanteNotificationService', () => ({
  postulanteNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn() },
}))

const ShellStub = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })

function registro(id: number, cambios: Partial<SocioNotificationRecord> = {}): SocioNotificationRecord {
  return { id, titulo: `Aviso ${id}`, cuerpo: `Texto ${id}`, leida: false, popup: false, createdAt: '2026-05-01T12:00:00Z', comunicadoId: null, ...cambios }
}

describe('notificaciones del postulante', () => {
  let pinia: Pinia

  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setSession({ token: 'tok', email: 'ana@ejemplo.test', role: 'POSTULANTE' })
    vi.mocked(postulanteNotificationService.list).mockResolvedValue([])
    vi.mocked(postulanteNotificationService.markAllRead).mockResolvedValue(undefined)
  })

  async function montar() {
    const wrapper = mount(PostulanteNotificacionesView, { global: { plugins: [pinia], stubs: { PostulanteShell: ShellStub } } })
    await flushPromises()
    return wrapper
  }

  const marcarTodo = (wrapper: Awaited<ReturnType<typeof montar>>) =>
    wrapper.findAll('button').find((b) => b.text() === 'Marcar todo como leído')!

  it('muestra el estado de carga mientras pide las notificaciones', async () => {
    vi.mocked(postulanteNotificationService.list).mockReturnValue(new Promise(() => {}))
    const wrapper = mount(PostulanteNotificacionesView, { global: { plugins: [pinia], stubs: { PostulanteShell: ShellStub } } })
    await flushPromises()
    expect(wrapper.text()).toContain('Cargando notificaciones...')
    expect(marcarTodo(wrapper).attributes('disabled')).toBeDefined()
  })

  it('sin notificaciones lo indica y no permite marcar como leídas', async () => {
    const wrapper = await montar()
    expect(wrapper.text()).toContain('No tenés notificaciones por ahora.')
    expect(marcarTodo(wrapper).attributes('disabled')).toBeDefined()
  })

  it('lista las notificaciones y destaca las no leídas', async () => {
    vi.mocked(postulanteNotificationService.list).mockResolvedValue([registro(1), registro(2, { leida: true, createdAt: '' })])
    const wrapper = await montar()
    const tarjetas = wrapper.findAll('.postulante-notification-card')
    expect(tarjetas).toHaveLength(2)
    expect(tarjetas[0].classes()).toContain('postulante-notification-card--unread')
    expect(tarjetas[1].classes()).not.toContain('postulante-notification-card--unread')
    expect(tarjetas[0].find('.postulante-notification-card__heading').text()).toBe('Aviso 1')
    expect(tarjetas[0].find('.postulante-notification-card__text').text()).toBe('Texto 1')
    expect(tarjetas[0].find('.postulante-notification-card__time').text()).toBe(new Date('2026-05-01T12:00:00Z').toLocaleString('es-UY'))
    expect(tarjetas[1].find('.postulante-notification-card__time').text()).toBe('')
  })

  it('al abrir una no leída la marca (con clic, Enter o Espacio) y no remarca las leídas', async () => {
    vi.mocked(postulanteNotificationService.list).mockResolvedValue([registro(1), registro(2), registro(3), registro(4, { leida: true })])
    vi.mocked(postulanteNotificationService.markOneRead).mockImplementation(async (id) => registro(Number(id), { leida: true }))
    const wrapper = await montar()
    const tarjetas = wrapper.findAll('.postulante-notification-card')

    await tarjetas[0].trigger('click')
    await tarjetas[1].trigger('keydown', { key: 'Enter' })
    await tarjetas[2].trigger('keydown', { key: ' ' })
    await tarjetas[3].trigger('click')
    await flushPromises()

    expect(postulanteNotificationService.markOneRead).toHaveBeenCalledTimes(3)
    expect(postulanteNotificationService.markOneRead).toHaveBeenNthCalledWith(1, 1)
    expect(postulanteNotificationService.markOneRead).toHaveBeenNthCalledWith(2, 2)
    expect(postulanteNotificationService.markOneRead).toHaveBeenNthCalledWith(3, 3)
    expect(wrapper.findAll('.postulante-notification-card--unread')).toHaveLength(0)
  })

  it('marca todas como leídas', async () => {
    vi.mocked(postulanteNotificationService.list).mockResolvedValue([registro(1), registro(2)])
    const wrapper = await montar()
    const boton = marcarTodo(wrapper)
    expect(boton.attributes('disabled')).toBeUndefined()
    await boton.trigger('click')
    await flushPromises()
    expect(postulanteNotificationService.markAllRead).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.postulante-notification-card--unread')).toHaveLength(0)
    expect(marcarTodo(wrapper).attributes('disabled')).toBeDefined()
  })
})
