// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import NotificationBell from './NotificationBell.vue'
import type { NotificationPreview } from '../utils/notificationPreview'

const aviso = (id: string, unread = false, createdAt: string | null = '2026-03-01T10:00:00Z'): NotificationPreview =>
  ({ id, title: `Título ${id}`, body: `Cuerpo ${id}`, createdAt, unread })

let wrapper: VueWrapper | null = null

async function montar(props: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/avisos', component: { template: '<div />' } },
      { path: '/otra', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  wrapper = mount(NotificationBell, {
    props: { to: '/avisos', items: [], ...props },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  return { wrapper, router }
}

const panel = () => document.querySelector<HTMLElement>('.notification-dropdown')

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('NotificationBell', () => {
  it('muestra el contador en la etiqueta y limita la insignia a 99+', async () => {
    const { wrapper } = await montar({ count: 150 })
    const boton = wrapper.get('button.notification-bell')
    expect(boton.attributes('aria-label')).toBe('Notificaciones: 150 pendientes')
    expect(wrapper.get('.notification-bell__badge').text()).toBe('99+')
    await wrapper.setProps({ count: 3 })
    expect(wrapper.get('.notification-bell__badge').text()).toBe('3')
    await wrapper.setProps({ count: 0, label: 'Avisos' })
    expect(boton.attributes('aria-label')).toBe('Avisos')
    expect(wrapper.find('.notification-bell__badge').exists()).toBe(false)
  })

  it('abre el panel, pide refrescar y lo cierra con un segundo clic', async () => {
    const { wrapper } = await montar({ items: [aviso('1')] })
    await wrapper.get('button.notification-bell').trigger('click')
    await flushPromises()
    expect(panel()).not.toBeNull()
    expect(wrapper.emitted('refresh')).toHaveLength(1)
    expect(wrapper.get('button.notification-bell').attributes('aria-expanded')).toBe('true')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar notificaciones')
    expect(panel()!.textContent).toContain('Estás al día')
    await wrapper.get('button.notification-bell').trigger('click')
    expect(panel()).toBeNull()
  })

  it('abre el detalle de un aviso, emite leído solo si no estaba leído y vuelve a la lista', async () => {
    const { wrapper } = await montar({ count: 1, items: [aviso('1', true), aviso('2', false, null)] })
    await wrapper.get('button.notification-bell').trigger('click')
    await flushPromises()
    expect(panel()!.textContent).toContain('1 sin leer')
    expect(panel()!.querySelectorAll('.notification-dropdown__dot')).toHaveLength(1)
    const items = panel()!.querySelectorAll<HTMLButtonElement>('.notification-dropdown__item')
    items[0].click()
    await flushPromises()
    expect(wrapper.emitted('read')).toEqual([['1']])
    expect(panel()!.querySelector('h3')!.textContent).toBe('Título 1')
    expect(panel()!.querySelector('.notification-dropdown__detail time')).not.toBeNull()
    panel()!.querySelector<HTMLButtonElement>('.notification-dropdown__back')!.click()
    await flushPromises()
    panel()!.querySelectorAll<HTMLButtonElement>('.notification-dropdown__item')[1].click()
    await flushPromises()
    expect(wrapper.emitted('read')).toHaveLength(1)
    expect(panel()!.querySelector('.notification-dropdown__detail time')).toBeNull()
  })

  it('muestra estados de carga, error con reintento y lista vacía', async () => {
    const { wrapper } = await montar({ loading: true })
    await wrapper.get('button.notification-bell').trigger('click')
    await flushPromises()
    expect(panel()!.textContent).toContain('Actualizando avisos...')
    expect(panel()!.textContent).toContain('Cargando notificaciones...')
    await wrapper.setProps({ loading: false, error: 'Falló la red' })
    expect(panel()!.textContent).toContain('No se pudieron actualizar los avisos')
    panel()!.querySelector<HTMLButtonElement>('.notification-dropdown__error button')!.click()
    expect(wrapper.emitted('refresh')).toHaveLength(2)
    expect(panel()!.querySelector('.notification-dropdown__empty')).toBeNull()
    await wrapper.setProps({ error: '' })
    expect(panel()!.textContent).toContain('No tenés notificaciones por ahora.')
  })

  it('avisa cuando solo muestra los más recientes y cierra al navegar con el enlace', async () => {
    const items = Array.from({ length: 12 }, (_, i) => aviso(String(i)))
    const { wrapper, router } = await montar({ items })
    await wrapper.get('button.notification-bell').trigger('click')
    await flushPromises()
    expect(panel()!.textContent).toContain('Mostrando las 10 más recientes')
    panel()!.querySelector<HTMLAnchorElement>('.notification-dropdown__footer a')!.click()
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/avisos')
    expect(panel()).toBeNull()
  })

  it('se cierra al hacer clic afuera, con Escape (devolviendo el foco) y al cambiar de ruta', async () => {
    const { wrapper, router } = await montar({ items: [aviso('1')] })
    const boton = wrapper.get('button.notification-bell')
    await boton.trigger('click')
    await flushPromises()
    panel()!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(panel()).not.toBeNull()
    document.dispatchEvent(new Event('pointerdown'))
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(panel()).toBeNull()

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await boton.trigger('click')
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(panel()).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(boton.element)

    await boton.trigger('click')
    await flushPromises()
    await router.push('/otra')
    await flushPromises()
    expect(panel()).toBeNull()
  })

  it('cierra con el botón X y recalcula la posición al redimensionar', async () => {
    const { wrapper } = await montar()
    window.dispatchEvent(new Event('resize'))
    const boton = wrapper.get('button.notification-bell')
    boton.element.getBoundingClientRect = () => ({ bottom: 40, right: 900 }) as DOMRect
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    await boton.trigger('click')
    await flushPromises()
    expect(panel()!.style.top).toBe('50px')
    expect(panel()!.style.left).toBe('500px')
    expect(panel()!.style.width).toBe('400px')
    expect(panel()!.style.maxHeight).toBe('560px')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
    window.dispatchEvent(new Event('resize'))
    await flushPromises()
    expect(panel()!.style.width).toBe('276px')
    expect(panel()!.style.left).toBe('12px')
    panel()!.querySelector<HTMLButtonElement>('[aria-label="Cerrar notificaciones"]')!.click()
    await flushPromises()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(boton.element)
  })
})
