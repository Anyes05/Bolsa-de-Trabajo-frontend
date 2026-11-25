// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import HistorialContable from './HistorialContable.vue'
import { cajaService, type AsientoContable } from '../../services/cajaService'

vi.mock('../../services/cajaService', () => ({
  cajaService: { historialContable: vi.fn() },
}))

function asiento(id: number, extra: Partial<AsientoContable> = {}): AsientoContable {
  return {
    id, entidad: 'CUOTA', entidadId: id * 10, tipo: 'EMISION', monto: 1500,
    registradoEn: '2025-03-01T10:00:00Z', autor: 'JOB:FACTURACION', motivo: 'Facturación del período 2025-03-01',
    datos: '{"fecha":"2025-03-01"}', ...extra,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

describe('historial contable inmutable', () => {
  beforeEach(() => {
    vi.mocked(cajaService.historialContable).mockReset()
  })

  it('muestra cada asiento con autor, motivo y datos originales, sin acciones', async () => {
    vi.mocked(cajaService.historialContable).mockReturnValueOnce(new Promise(() => {}))
    const cargando = mount(HistorialContable, { props: { socioId: 7 } })
    expect(cargando.text()).toContain('Cargando asientos...')
    cargando.unmount()

    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([
      asiento(1),
      asiento(2, { entidad: 'PAGO', entidadId: 33, monto: -800, autor: 'ADMIN:admin@ccisj.test', motivo: 'Cobro' }),
    ])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()

    expect(cajaService.historialContable).toHaveBeenLastCalledWith(7)
    const items = wrapper.findAll('.accounting-history__item')
    expect(items).toHaveLength(2)
    expect(items[0]!.find('.accounting-history__heading').text()).toContain('#1 · EMISION CUOTA #10')
    expect(items[0]!.text()).toContain('JOB:FACTURACION')
    expect(items[0]!.text()).toContain('Facturación del período 2025-03-01')
    expect(items[0]!.find('.accounting-history__data').text()).toBe('{"fecha":"2025-03-01"}')
    expect(items[1]!.text()).toContain('#2 · EMISION PAGO #33')
    expect(items[1]!.text()).toContain('ADMIN:admin@ccisj.test')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('indica cuando no hay asientos', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    expect(wrapper.text()).toContain('No hay asientos registrados.')
  })

  it('muestra el error de carga y permite reintentar', async () => {
    vi.mocked(cajaService.historialContable)
      .mockRejectedValueOnce(new Error('Sin conexión al servidor'))
      .mockResolvedValueOnce([asiento(1)])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('Sin conexión al servidor')
    expect(wrapper.text()).not.toContain('No hay asientos registrados.')

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('.accounting-history__item')).toHaveLength(1)
  })

  it('descarta respuestas obsoletas al cambiar de socio', async () => {
    const primero = deferred<AsientoContable[]>()
    const primeroError = deferred<AsientoContable[]>()
    vi.mocked(cajaService.historialContable)
      .mockReturnValueOnce(primero.promise)
      .mockReturnValueOnce(primeroError.promise)
      .mockResolvedValueOnce([asiento(30)])
    const wrapper = mount(HistorialContable, { props: { socioId: 1 } })
    await wrapper.setProps({ socioId: 2 })
    await wrapper.setProps({ socioId: 3 })
    await flushPromises()
    expect(wrapper.text()).toContain('#30 · EMISION CUOTA #300')

    // Respuestas tardías de socios anteriores no pisan el estado actual.
    primero.resolve([asiento(10)])
    primeroError.reject(new Error('Error tardío'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('#10 ·')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Cargando asientos...')
    expect(cajaService.historialContable).toHaveBeenLastCalledWith(3)
  })
})
