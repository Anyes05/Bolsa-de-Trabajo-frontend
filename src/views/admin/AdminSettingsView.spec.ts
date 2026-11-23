// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AdminSettingsView from './AdminSettingsView.vue'
import { tarifaService } from '../../services/tarifaService'
import type { Tarifa } from '../../services/types'

vi.mock('../../services/tarifaService', () => ({
  tarifaService: { list: vi.fn(), save: vi.fn(), generateBilling: vi.fn() },
}))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

function tarifa(id: number, anio: number, montoBase: number): Tarifa {
  return { id, anio, montoBase, diaVencimiento: 31, createdAt: '2025-01-01T00:00:00Z' }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function montar() {
  return mount(AdminSettingsView, { global: { stubs: { AdminShell: AdminShellStub } } })
}

function botonGuardar(wrapper: ReturnType<typeof montar>) {
  return wrapper.find('button.fee-save')
}

describe('configuración de la cuota', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'))
    vi.mocked(tarifaService.list).mockReset()
    vi.mocked(tarifaService.save).mockReset()
  })

  afterEach(() => vi.useRealTimers())

  it('carga el historial y precarga el monto vigente del año actual', async () => {
    vi.mocked(tarifaService.list).mockResolvedValueOnce([tarifa(1, 2024, 1200), tarifa(2, 2025, 1500.5)])
    const wrapper = montar()
    await nextTick()
    expect(botonGuardar(wrapper).attributes('disabled')).toBeDefined()
    await flushPromises()

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe('configuracion')
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('1500.5')
    const entradas = wrapper.findAll('.fee-history__entry')
    expect(entradas).toHaveLength(2)
    expect(entradas[0]!.text()).toContain('Año 2024')
    expect(entradas[0]!.text()).not.toContain('Vigente')
    expect(entradas[1]!.text()).toContain('Vigente')
    expect(entradas[1]!.text()).toMatch(/1\.500,5/)
    expect(botonGuardar(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('deja el monto vacío si no hay tarifa para el año actual', async () => {
    vi.mocked(tarifaService.list).mockResolvedValueOnce([tarifa(1, 2024, 1200)])
    const wrapper = montar()
    await flushPromises()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('muestra el error si no se pueden cargar las tarifas', async () => {
    vi.mocked(tarifaService.list).mockRejectedValueOnce(new Error('Servicio no disponible'))
    const wrapper = montar()
    await flushPromises()
    expect(wrapper.text()).toContain('Servicio no disponible')
    expect(botonGuardar(wrapper).attributes('disabled')).toBeUndefined()
  })

  it.each(['', '0', '-5', '10.123', 'abc'])('rechaza el monto inválido "%s" sin llamar al servicio', async (monto) => {
    vi.mocked(tarifaService.list).mockResolvedValueOnce([])
    const wrapper = montar()
    await flushPromises()
    const input = wrapper.find('input')
    ;(input.element as HTMLInputElement).value = monto
    await input.trigger('input')
    await botonGuardar(wrapper).trigger('click')
    expect(wrapper.text()).toContain('Ingrese un monto mayor a cero con hasta dos decimales.')
    expect(tarifaService.save).not.toHaveBeenCalled()
  })

  it('guarda el monto del año actual, informa el éxito y recarga el historial', async () => {
    vi.mocked(tarifaService.list)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([tarifa(3, 2025, 1800.25)])
    const guardado = deferred<Tarifa>()
    vi.mocked(tarifaService.save).mockReturnValueOnce(guardado.promise)
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('input').setValue('1800.25')
    await botonGuardar(wrapper).trigger('click')
    expect(botonGuardar(wrapper).text()).toContain('Guardando...')
    expect(botonGuardar(wrapper).attributes('disabled')).toBeDefined()

    guardado.resolve(tarifa(3, 2025, 1800.25))
    await flushPromises()

    expect(tarifaService.save).toHaveBeenCalledWith({ anio: 2025, montoBase: 1800.25, diaVencimiento: 31 })
    expect(tarifaService.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.fee-success').text()).toContain('Monto de cuota guardado.')
    expect(wrapper.findAll('.fee-history__entry')).toHaveLength(1)
    expect(botonGuardar(wrapper).text()).toContain('Guardar monto')
  })

  it('muestra el error del servidor al guardar y limpia el éxito anterior', async () => {
    vi.mocked(tarifaService.list).mockResolvedValue([])
    vi.mocked(tarifaService.save)
      .mockResolvedValueOnce(tarifa(1, 2025, 100))
      .mockRejectedValueOnce(new Error('La tarifa ya generó cuotas'))
    const wrapper = montar()
    await flushPromises()
    await wrapper.find('input').setValue('100')
    await botonGuardar(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.find('.fee-success').exists()).toBe(true)

    await wrapper.find('input').setValue('200')
    await botonGuardar(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.find('.fee-success').exists()).toBe(false)
    expect(wrapper.text()).toContain('La tarifa ya generó cuotas')
  })
})
