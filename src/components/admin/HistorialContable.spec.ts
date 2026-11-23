// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import HistorialContable from './HistorialContable.vue'
import { cajaService, type AsientoContable } from '../../services/cajaService'

vi.mock('../../services/cajaService', () => ({
  cajaService: { historialContable: vi.fn(), anularCuota: vi.fn() },
}))

function asiento(id: number, extra: Partial<AsientoContable> = {}): AsientoContable {
  return {
    id, entidad: 'CUOTA', entidadId: id * 10, tipo: 'EMISION', monto: 1500,
    registradoEn: '2025-03-01T10:00:00Z', autor: 'admin@ccisj.test', motivo: 'Emisión mensual',
    originalId: null, datos: '{"fecha":"2025-03-01"}', ...extra,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

function botonAnular(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').filter((b) => b.text().includes('Anular cuota'))
}

describe('historial contable inmutable', () => {
  beforeEach(() => {
    vi.mocked(cajaService.historialContable).mockReset()
    vi.mocked(cajaService.anularCuota).mockReset()
  })

  it('muestra los asientos y solo permite anular cuotas emitidas sin reversa', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([
      asiento(1),
      asiento(2),
      asiento(3, { tipo: 'ANULACION', originalId: 2, monto: -1500, motivo: 'Duplicada' }),
      asiento(4, { entidad: 'REINTEGRO' }),
    ])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    expect(wrapper.text()).toContain('Cargando asientos...')
    await flushPromises()

    expect(cajaService.historialContable).toHaveBeenCalledWith(7)
    expect(wrapper.text()).not.toContain('Cargando asientos...')
    expect(wrapper.findAll('li')).toHaveLength(4)
    expect(wrapper.text()).toContain('#1 · EMISION CUOTA #10')
    expect(wrapper.text()).toContain('Reversa del asiento #2')
    expect(wrapper.text()).toContain('{"fecha":"2025-03-01"}')
    // Solo el asiento 1 es anulable: el 2 ya tiene reversa y el 4 no es cuota.
    const botones = botonAnular(wrapper)
    expect(botones).toHaveLength(1)
    expect(wrapper.findAll('li')[0]!.text()).toContain('Anular cuota')
  })

  it('no permite anular cuotas si la cuenta tiene pagos registrados', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([asiento(1), asiento(2, { entidad: 'PAGO' })])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    expect(botonAnular(wrapper)).toHaveLength(0)
  })

  it('muestra el estado vacío cuando no hay asientos', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    expect(wrapper.text()).toContain('No hay asientos registrados.')
  })

  it('anula una cuota con motivo recortado, recarga y emite actualizado', async () => {
    vi.mocked(cajaService.historialContable)
      .mockResolvedValueOnce([asiento(1)])
      .mockResolvedValueOnce([asiento(1), asiento(2, { tipo: 'ANULACION', originalId: 1 })])
    vi.mocked(cajaService.anularCuota).mockResolvedValueOnce(undefined)
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()

    await botonAnular(wrapper)[0]!.trigger('click')
    expect(wrapper.find('form').text()).toContain('Motivo de anulación de cuota #10')
    const confirmar = wrapper.findAll('button').find((b) => b.text() === 'Confirmar anulación')!
    expect(confirmar.attributes('disabled')).toBeDefined()

    // Un motivo vacío no dispara la anulación.
    await wrapper.find('textarea').setValue('   ')
    await wrapper.find('form').trigger('submit')
    expect(cajaService.anularCuota).not.toHaveBeenCalled()

    await wrapper.find('textarea').setValue('  Emisión duplicada  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(cajaService.anularCuota).toHaveBeenCalledWith(7, 10, 'Emisión duplicada')
    expect(cajaService.historialContable).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('actualizado')).toHaveLength(1)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(botonAnular(wrapper)).toHaveLength(0)
  })

  it('ignora un segundo envío mientras la anulación está en curso', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValue([asiento(1)])
    const pendiente = deferred<void>()
    vi.mocked(cajaService.anularCuota).mockReturnValueOnce(pendiente.promise)
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    await botonAnular(wrapper)[0]!.trigger('click')
    await wrapper.find('textarea').setValue('Error de carga')
    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')
    expect(cajaService.anularCuota).toHaveBeenCalledTimes(1)
    pendiente.resolve()
    await flushPromises()
  })

  it('muestra el error de anulación y mantiene el formulario abierto', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([asiento(1)])
    vi.mocked(cajaService.anularCuota).mockRejectedValueOnce(new Error('Requiere conciliación'))
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    await botonAnular(wrapper)[0]!.trigger('click')
    await wrapper.find('textarea').setValue('Error')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Requiere conciliación')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.emitted('actualizado')).toBeUndefined()
  })

  it('cancela el formulario de anulación', async () => {
    vi.mocked(cajaService.historialContable).mockResolvedValueOnce([asiento(1)])
    const wrapper = mount(HistorialContable, { props: { socioId: 7 } })
    await flushPromises()
    await botonAnular(wrapper)[0]!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Cancelar')!.trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
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
    expect(wrapper.findAll('li')).toHaveLength(1)
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
