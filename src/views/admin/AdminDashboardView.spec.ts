// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils'
import AdminDashboardView from './AdminDashboardView.vue'
import { cajaService } from '../../services/cajaService'
import { cajaExcelService } from '../../services/cajaExcelService'
import type { CajaResumen, CuentaCaja, HistorialCaja, MovimientoCaja, ReintegroProgramado } from '../../services/types'

vi.mock('../../services/cajaService', () => ({
  cajaService: {
    getResumen: vi.fn(), getHistorial: vi.fn(), registrarCobro: vi.fn(), registrarReintegro: vi.fn(),
    actualizarProgramado: vi.fn(), eliminarProgramado: vi.fn(), historialContable: vi.fn(), anularCuota: vi.fn(),
  },
}))
vi.mock('../../services/cajaExcelService', () => ({ cajaExcelService: { download: vi.fn() } }))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

// El historial contable tiene su propio spec; acá solo importa el evento "actualizado".
const HistorialContableStub = defineComponent({
  name: 'HistorialContable',
  props: { socioId: Number },
  emits: ['actualizado'],
  setup(props) {
    return () => h('div', { class: 'historial-contable-stub' }, `contable ${props.socioId}`)
  },
})

function cuenta(socioId: number, extra: Partial<CuentaCaja> = {}): CuentaCaja {
  return {
    socioId, bps: `B-${socioId}`, razonSocial: `Socio ${socioId}`, nombreRubro: 'Comercio', telefono: '099',
    estadoMorosidad: 'AL_DIA', cuotaId: null, estadoCuota: null, montoCuota: null, montoTimbre: null,
    timbreRecurrente: false, periodo: null, fechaVencimiento: null, saldo: 0, deudaVencida: 0, rut: null, cedula: null,
    ...extra,
  }
}

function movimiento(id: number, tipo: MovimientoCaja['tipo'], fecha: string, extra: Partial<MovimientoCaja> = {}): MovimientoCaja {
  return {
    id, tipo, concepto: `${tipo} ${id}`, fecha, fechaVencimiento: null, monto: 1000, saldoAnterior: 0,
    saldoResultante: 1000, saldoFavorUtilizado: 0, pendiente: 0, metodoPago: null, referencia: null,
    observaciones: null, recurrente: null, ...extra,
  }
}

function historial(socioId: number, extra: Partial<HistorialCaja> = {}): HistorialCaja {
  return {
    socioId, razonSocial: `Socio ${socioId}`, bps: `B-${socioId}`, nombreRubro: 'Comercio', estadoMorosidad: 'AL_DIA',
    saldo: 0, deudaVencida: 0, movimientos: [], reintegrosProgramados: [], rut: null, cedula: null, ...extra,
  }
}

const cuentas = [
  cuenta(1, { razonSocial: 'Alfa SA', rut: '211111', nombreRubro: 'Ferretería' }),
  cuenta(2, { razonSocial: 'Beta SRL', bps: null, nombreRubro: null, estadoMorosidad: 'MOROSO', saldo: 1500, cedula: '4.444.444-4' }),
  cuenta(3, { razonSocial: 'Gamma', estadoMorosidad: 'INACTIVO', saldo: 0 }),
  cuenta(4, { razonSocial: 'Delta', estadoMorosidad: 'INACTIVO', saldo: 300 }),
  cuenta(5, { razonSocial: 'Epsilon', saldo: -200 }),
]

function resumen(lista: CuentaCaja[] = cuentas): CajaResumen {
  return { totalSocios: lista.length, alDia: 2, pendiente: 1, inactivos: 2, cuentas: lista }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

type Wrapper = VueWrapper<InstanceType<typeof AdminDashboardView>>

async function montar(datos: CajaResumen = resumen()) {
  vi.mocked(cajaService.getResumen).mockResolvedValueOnce(datos)
  const wrapper = mount(AdminDashboardView, {
    global: { stubs: { AdminShell: AdminShellStub, HistorialContable: HistorialContableStub } },
  }) as Wrapper
  await flushPromises()
  return wrapper
}

function boton(raiz: Wrapper | DOMWrapper<Element>, texto: string) {
  const encontrado = raiz.findAll('button').find((b) => b.text().trim() === texto)
  if (!encontrado) throw new Error(`No se encontró el botón "${texto}"`)
  return encontrado
}

function fila(wrapper: Wrapper, razonSocial: string) {
  const encontrada = wrapper.findAll('tbody tr').find((tr) => tr.text().includes(razonSocial))
  if (!encontrada) throw new Error(`No se encontró la fila ${razonSocial}`)
  return encontrada
}

// Simula un click que llega aunque el botón esté deshabilitado (p. ej. doble envío o habilitación tardía).
async function clickForzado(elemento: DOMWrapper<Element>) {
  elemento.element.removeAttribute('disabled')
  elemento.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

function modalCobro(wrapper: Wrapper) {
  return wrapper.find('[aria-labelledby="cash-modal-title"]')
}

function modalExcel(wrapper: Wrapper) {
  return wrapper.find('.excel-modal')
}

function modalHistorial(wrapper: Wrapper) {
  return wrapper.find('.history-modal')
}

function modalReintegros(wrapper: Wrapper) {
  return wrapper.find('.expense-modal')
}

describe('control de caja del administrador', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2025, 2, 15, 12, 0, 0))
    vi.resetAllMocks()
  })

  afterEach(() => vi.useRealTimers())

  describe('listado y filtros', () => {
    it('muestra métricas, filas y acciones según el estado de cada socio', async () => {
      const wrapper = await montar()
      expect(wrapper.find('[data-active]').attributes('data-active')).toBe('dashboard')
      const metricas = wrapper.findAll('.cash-metric')
      expect(metricas.map((m) => m.find('strong').text())).toEqual(['5', '2', '1', '2'])
      expect(wrapper.findAll('tbody tr')).toHaveLength(5)

      const beta = fila(wrapper, 'Beta SRL')
      expect(beta.text()).toContain('#S002')
      expect(beta.findAll('td')[2]!.text()).toBe('-')
      expect(beta.findAll('td')[3]!.text()).toBe('-')
      expect(beta.text()).toContain('Moroso')
      expect(beta.find('.cash-status--yellow').exists()).toBe(true)

      const epsilon = fila(wrapper, 'Epsilon')
      expect(epsilon.find('.cash-balance-credit').text()).toMatch(/^\+.*200,00/)

      // Inactivo sin deuda: solo historial. Inactivo con deuda: cobro e historial.
      const gamma = fila(wrapper, 'Gamma')
      expect(gamma.findAll('button').map((b) => b.text().trim())).toEqual(['Historial'])
      const delta = fila(wrapper, 'Delta')
      expect(delta.findAll('button').map((b) => b.text().trim())).toEqual(['Cobro', 'Historial'])
      expect(fila(wrapper, 'Alfa SA').findAll('button').map((b) => b.text().trim())).toEqual(['Cobro', 'Reintegro', 'Historial'])
    })

    it('filtra por métricas, botones de filtro y búsqueda de texto', async () => {
      const wrapper = await montar()
      const metricas = wrapper.findAll('.cash-metric')

      await metricas[2]!.trigger('click')
      expect(metricas[2]!.attributes('aria-pressed')).toBe('true')
      expect(wrapper.findAll('tbody tr').map((tr) => tr.findAll('td')[1]!.text())).toEqual(['Beta SRL', 'Delta'])

      // Click en la métrica activa vuelve a "Todos".
      await metricas[2]!.trigger('click')
      expect(wrapper.findAll('tbody tr')).toHaveLength(5)

      await boton(wrapper, 'Inactivo').trigger('click')
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
      expect(boton(wrapper, 'Inactivo').classes()).toContain('cash-filter--active')

      await boton(wrapper, 'Todos').trigger('click')
      await wrapper.find('.cash-search input').setValue('ferre')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)

      await wrapper.find('.cash-search input').setValue('no existe')
      expect(wrapper.find('table').exists()).toBe(false)
      expect(wrapper.text()).toContain('No hay socios para mostrar.')
    })

    it('muestra el estado de carga y el error del resumen', async () => {
      const pendiente = deferred<CajaResumen>()
      vi.mocked(cajaService.getResumen).mockReturnValueOnce(pendiente.promise)
      const wrapper = mount(AdminDashboardView, {
        global: { stubs: { AdminShell: AdminShellStub, HistorialContable: HistorialContableStub } },
      })
      await nextTick()
      expect(wrapper.text()).toContain('Cargando control de caja...')
      expect(wrapper.find('.cash-download').attributes('disabled')).toBeDefined()
      pendiente.reject(new Error('Servidor caído'))
      await flushPromises()
      expect(wrapper.find('[role="alert"]').text()).toContain('Servidor caído')
      // Sin resumen las métricas quedan en cero.
      expect(wrapper.findAll('.cash-metric strong').map((m) => m.text())).toEqual(['0', '0', '0', '0'])
    })
  })

  describe('exportación a Excel', () => {
    async function abrirExportacion() {
      const wrapper = await montar()
      await wrapper.find('.cash-download').trigger('click')
      return wrapper
    }

    function contador(wrapper: Wrapper) {
      return wrapper.find('.excel-footer [role="status"]').text()
    }

    it('descarga todos los socios de los estados elegidos y cierra el modal', async () => {
      vi.mocked(cajaExcelService.download).mockResolvedValueOnce(undefined)
      const wrapper = await abrirExportacion()
      expect(modalExcel(wrapper).exists()).toBe(true)
      expect(contador(wrapper)).toBe('5 socios seleccionados')

      const estados = wrapper.findAll('.excel-states input')
      await estados[2]!.setValue(false)
      expect(contador(wrapper)).toBe('3 socios seleccionados')

      await boton(modalExcel(wrapper), 'Descargar Excel').trigger('click')
      await flushPromises()

      const [enviados, rango] = vi.mocked(cajaExcelService.download).mock.calls[0]!
      expect(enviados.map((c) => c.socioId)).toEqual([1, 2, 5])
      expect(rango).toEqual({ desde: '', hasta: '' })
      expect(modalExcel(wrapper).exists()).toBe(false)
    })

    it('avisa cuando no hay estados elegidos y deshabilita la descarga', async () => {
      const wrapper = await abrirExportacion()
      for (const estado of wrapper.findAll('.excel-states input')) await estado.setValue(false)
      expect(wrapper.text()).toContain('Selecciona al menos un estado.')
      expect(contador(wrapper)).toBe('0 socios seleccionados')
      const descargar = boton(modalExcel(wrapper), 'Descargar Excel')
      expect(descargar.attributes('disabled')).toBeDefined()
      await clickForzado(descargar)
      expect(cajaExcelService.download).not.toHaveBeenCalled()
    })

    it('permite elegir socios puntuales con búsqueda y selección masiva', async () => {
      vi.mocked(cajaExcelService.download).mockResolvedValueOnce(undefined)
      const wrapper = await abrirExportacion()
      await wrapper.find('input[value="SELECCIONADOS"]').setValue()
      expect(contador(wrapper)).toBe('0 socios seleccionados')
      expect(wrapper.findAll('.excel-company')).toHaveLength(5)
      expect(wrapper.find('.excel-company').text()).toContain('B-1')
      expect(wrapper.findAll('.excel-company')[1]!.text()).toContain('Sin identificador')

      // Selección individual: el "seleccionar todos" queda indeterminado.
      await wrapper.findAll('.excel-company input')[0]!.setValue(true)
      const todos = wrapper.find('.excel-select-all input')
      expect((todos.element as HTMLInputElement).indeterminate).toBe(true)
      expect(contador(wrapper)).toBe('1 socios seleccionados')

      await todos.trigger('change')
      expect((todos.element as HTMLInputElement).checked).toBe(true)
      expect(contador(wrapper)).toBe('5 socios seleccionados')

      await todos.trigger('change')
      expect(contador(wrapper)).toBe('0 socios seleccionados')

      // La búsqueda contempla RUT, cédula y rubro.
      const buscador = wrapper.find('input[aria-label="Buscar socios para exportar"]')
      await buscador.setValue('211111')
      expect(wrapper.findAll('.excel-company')).toHaveLength(1)
      await buscador.setValue('4.444')
      expect(wrapper.findAll('.excel-company').map((c) => c.find('strong').text())).toEqual(['Beta SRL'])
      await wrapper.find('.excel-select-all input').trigger('change')
      expect(contador(wrapper)).toBe('1 socios seleccionados')

      await buscador.setValue('zzz')
      expect(wrapper.text()).toContain('No hay socios que coincidan con los estados y la búsqueda.')
      expect(wrapper.find('.excel-select-all input').attributes('disabled')).toBeDefined()

      await boton(modalExcel(wrapper), 'Descargar Excel').trigger('click')
      await flushPromises()
      expect(vi.mocked(cajaExcelService.download).mock.calls[0]![0].map((c) => c.socioId)).toEqual([2])
    })

    it('valida el rango de fechas antes de descargar', async () => {
      vi.mocked(cajaExcelService.download).mockResolvedValueOnce(undefined)
      const wrapper = await abrirExportacion()
      const [desde, hasta] = modalExcel(wrapper).findAll('input[type="date"]')
      await desde!.setValue('2025-03-10')
      await hasta!.setValue('2025-03-01')
      expect(modalExcel(wrapper).find('[role="alert"]').text()).toBe('La fecha Desde no puede ser posterior a Hasta.')
      expect(desde!.attributes('aria-invalid')).toBe('true')
      expect(hasta!.attributes('min')).toBe('2025-03-10')
      expect(desde!.attributes('max')).toBe('2025-03-01')

      const descargar = boton(modalExcel(wrapper), 'Descargar Excel')
      expect(descargar.attributes('disabled')).toBeDefined()
      await clickForzado(descargar)
      expect(cajaExcelService.download).not.toHaveBeenCalled()
      expect(modalExcel(wrapper).findAll('[role="alert"]')).toHaveLength(2)

      await hasta!.setValue('2025-03-31')
      await boton(modalExcel(wrapper), 'Descargar Excel').trigger('click')
      await flushPromises()
      expect(vi.mocked(cajaExcelService.download).mock.calls[0]![1]).toEqual({ desde: '2025-03-10', hasta: '2025-03-31' })
    })

    it('mantiene el modal abierto mientras genera y muestra el error de descarga', async () => {
      const descarga = deferred<void>()
      vi.mocked(cajaExcelService.download).mockReturnValueOnce(descarga.promise)
      const wrapper = await abrirExportacion()
      await boton(modalExcel(wrapper), 'Descargar Excel').trigger('click')
      expect(modalExcel(wrapper).text()).toContain('Generando...')
      expect(modalExcel(wrapper).attributes('aria-busy')).toBe('true')

      // Ni Escape ni el fondo cierran el modal durante la generación.
      await wrapper.find('.cash-modal-layer').trigger('keydown', { key: 'Escape' })
      await wrapper.find('.cash-modal-layer').trigger('click')
      expect(modalExcel(wrapper).exists()).toBe(true)

      descarga.reject(new Error('No se pudo generar el archivo'))
      await flushPromises()
      expect(modalExcel(wrapper).find('[role="alert"]').text()).toContain('No se pudo generar el archivo')
      expect(modalExcel(wrapper).exists()).toBe(true)
    })

    it('cierra con Cancelar, con Escape y reinicia las opciones al reabrir', async () => {
      const wrapper = await abrirExportacion()
      await wrapper.find('input[value="SELECCIONADOS"]').setValue()
      await boton(modalExcel(wrapper), 'Cancelar').trigger('click')
      expect(modalExcel(wrapper).exists()).toBe(false)

      await wrapper.find('.cash-download').trigger('click')
      expect((wrapper.find('input[value="TODOS"]').element as HTMLInputElement).checked).toBe(true)
      await wrapper.find('.cash-modal-layer').trigger('keydown', { key: 'Escape' })
      expect(modalExcel(wrapper).exists()).toBe(false)

      await wrapper.find('.cash-download').trigger('click')
      await wrapper.find('.excel-modal button[aria-label="Cerrar"]').trigger('click')
      expect(modalExcel(wrapper).exists()).toBe(false)
    })
  })

  describe('registro de cobros', () => {
    it('muestra los totales del mes y registra el cobro con los datos ingresados', async () => {
      const wrapper = await montar()
      const cuentaPendiente = deferred<HistorialCaja>()
      vi.mocked(cajaService.getHistorial).mockReturnValueOnce(cuentaPendiente.promise)
      await boton(fila(wrapper, 'Beta SRL'), 'Cobro').trigger('click')
      expect(modalCobro(wrapper).text()).toContain('Cargando estado de cuenta...')
      expect(modalCobro(wrapper).text()).toContain('#S002')
      expect(boton(modalCobro(wrapper), 'Confirmar Cobro').attributes('disabled')).toBeDefined()

      cuentaPendiente.resolve(historial(2, {
        estadoMorosidad: 'MOROSO', saldo: 1500,
        movimientos: [
          movimiento(1, 'CUOTA', '2025-02-01', { pendiente: 0 }),
          movimiento(2, 'CUOTA', '2025-03-01', { pendiente: 1000 }),
          movimiento(3, 'REINTEGRO', '2025-03-02', { pendiente: 500, monto: 500 }),
        ],
      }))
      await flushPromises()
      const resumenCuenta = modalCobro(wrapper).find('.account-summary').text()
      expect(resumenCuenta).toMatch(/Reintegro de este mes.*500,00/)
      expect(resumenCuenta).toMatch(/Cuota a pagar.*1\.000,00/)
      expect(resumenCuenta).toMatch(/Total.*1\.500,00/)

      await boton(modalCobro(wrapper), 'Transferencia').trigger('click')
      expect(boton(modalCobro(wrapper), 'Transferencia').classes()).toContain('cash-payment__option--active')
      await modalCobro(wrapper).find('.cash-amount input').setValue('600')
      expect(modalCobro(wrapper).find('.account-result').text()).toMatch(/900,00/)
      const detalles = modalCobro(wrapper).findAll('.cash-payment-detail')
      await detalles[0]!.find('input').setValue('  REF-1  ')
      await detalles[1]!.find('textarea').setValue('   ')

      const cobro = deferred<CuentaCaja>()
      vi.mocked(cajaService.registrarCobro).mockReturnValueOnce(cobro.promise)
      vi.mocked(cajaService.getResumen).mockResolvedValueOnce(resumen())
      await boton(modalCobro(wrapper), 'Confirmar Cobro').trigger('click')
      expect(modalCobro(wrapper).text()).toContain('Registrando...')
      // Un segundo click durante el registro no duplica el cobro.
      await clickForzado(boton(modalCobro(wrapper), 'Registrando...'))
      // El fondo tampoco cierra el modal mientras se registra.
      await wrapper.find('.cash-modal-layer').trigger('click')
      expect(modalCobro(wrapper).exists()).toBe(true)

      cobro.resolve(cuentas[1]!)
      await flushPromises()
      expect(cajaService.registrarCobro).toHaveBeenCalledTimes(1)
      expect(cajaService.registrarCobro).toHaveBeenCalledWith({
        socioId: 2, metodoPago: 'TRANSFERENCIA', montoRecibido: 600, nroCobranzaExterno: 'REF-1', observaciones: null,
      })
      expect(modalCobro(wrapper).exists()).toBe(false)
      expect(cajaService.getResumen).toHaveBeenCalledTimes(2)
    })

    it.each([
      ['sin cargos en el mes', [], 'Sin reintegros', 'Sin cuota emitida'],
      ['con cargos pagados', [
        movimiento(1, 'CUOTA', '2025-03-01', { pendiente: 0 }),
        movimiento(2, 'REINTEGRO', '2025-03-01', { pendiente: 0 }),
      ], 'Pagado', 'Paga'],
      ['con cuota anterior paga y sin cuota del mes', [movimiento(1, 'CUOTA', '2025-02-01', { pendiente: 0 })], 'Sin reintegros', 'Paga'],
    ])('resume la cuenta %s', async (_caso, movimientos, reintegro, cuota) => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1, { movimientos }))
      await boton(fila(wrapper, 'Alfa SA'), 'Cobro').trigger('click')
      await flushPromises()
      const datos = modalCobro(wrapper).findAll('.account-summary dd').map((dd) => dd.text())
      expect(datos[0]).toBe(reintegro)
      expect(datos[1]).toBe(cuota)
    })

    it('informa que el cobro a un socio inactivo solo cancela su deuda', async () => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(4, { estadoMorosidad: 'INACTIVO', saldo: 300 }))
      await boton(fila(wrapper, 'Delta'), 'Cobro').trigger('click')
      await flushPromises()
      expect(modalCobro(wrapper).text()).toContain('El socio seguirá inactivo')
      expect(modalCobro(wrapper).text()).toMatch(/Deuda pendiente total.*300,00/)
    })

    it('bloquea el cobro si la cuenta no cargó o si el inactivo ya no debe', async () => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockRejectedValueOnce(new Error('Cuenta no disponible'))
      await boton(fila(wrapper, 'Alfa SA'), 'Cobro').trigger('click')
      await flushPromises()
      expect(modalCobro(wrapper).find('[role="alert"]').text()).toContain('Cuenta no disponible')
      await modalCobro(wrapper).find('.cash-amount input').setValue('100')
      await clickForzado(boton(modalCobro(wrapper), 'Confirmar Cobro'))
      expect(modalCobro(wrapper).find('[role="alert"]').text()).toContain('No hay una cuenta disponible para cobrar')
      expect(cajaService.registrarCobro).not.toHaveBeenCalled()
      await boton(modalCobro(wrapper), 'Cancelar').trigger('click')

      // Socio inactivo cuya deuda ya fue saldada al recargar la cuenta.
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(4, { estadoMorosidad: 'INACTIVO', saldo: 0 }))
      await boton(fila(wrapper, 'Delta'), 'Cobro').trigger('click')
      await flushPromises()
      await modalCobro(wrapper).find('.cash-amount input').setValue('100')
      expect(boton(modalCobro(wrapper), 'Confirmar Cobro').attributes('disabled')).toBeDefined()
      await clickForzado(boton(modalCobro(wrapper), 'Confirmar Cobro'))
      expect(modalCobro(wrapper).findAll('[role="alert"]').map((a) => a.text()).join(' ')).toContain('el socio inactivo ya no tiene deuda pendiente')
      expect(cajaService.registrarCobro).not.toHaveBeenCalled()
    })

    it('valida el monto recibido', async () => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1))
      await boton(fila(wrapper, 'Alfa SA'), 'Cobro').trigger('click')
      await flushPromises()
      const monto = modalCobro(wrapper).find('.cash-amount input')
      expect((monto.element as HTMLInputElement).value).toBe('0')
      expect(modalCobro(wrapper).find('.account-result').exists()).toBe(false)
      await clickForzado(boton(modalCobro(wrapper), 'Confirmar Cobro'))
      expect(modalCobro(wrapper).find('[role="alert"]').text()).toBe('Ingrese un monto recibido mayor a cero, con hasta dos decimales.')

      // Montos con más de dos decimales o fuera de rango no muestran saldo resultante.
      await monto.setValue('10.55')
      expect(modalCobro(wrapper).find('.account-result').exists()).toBe(true)
      await monto.setValue('10.555')
      expect(modalCobro(wrapper).find('.account-result').exists()).toBe(false)
      await monto.setValue('10000000000')
      expect(modalCobro(wrapper).find('.account-result').exists()).toBe(false)
      expect(cajaService.registrarCobro).not.toHaveBeenCalled()
    })

    it('muestra el error del registro y permite cerrar el modal', async () => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(5, { saldo: -200 }))
      await boton(fila(wrapper, 'Epsilon'), 'Cobro').trigger('click')
      await flushPromises()
      await boton(modalCobro(wrapper), 'Cobrador').trigger('click')
      await modalCobro(wrapper).find('.cash-amount input').setValue('50.5')
      // Saldo a favor de 200 más el pago: el saldo resultante se muestra en valor absoluto.
      expect(modalCobro(wrapper).find('.account-result').text()).toMatch(/250,50/)
      await modalCobro(wrapper).find('.cash-payment-detail textarea').setValue(' Pago en oficina ')
      vi.mocked(cajaService.registrarCobro).mockRejectedValueOnce(new Error('Caja cerrada'))
      await boton(modalCobro(wrapper), 'Confirmar Cobro').trigger('click')
      await flushPromises()
      expect(cajaService.registrarCobro).toHaveBeenCalledWith({
        socioId: 5, metodoPago: 'COBRADOR', montoRecibido: 50.5, nroCobranzaExterno: null, observaciones: 'Pago en oficina',
      })
      expect(modalCobro(wrapper).find('[role="alert"]').text()).toContain('Caja cerrada')

      await wrapper.find('.cash-modal-layer').trigger('click')
      expect(modalCobro(wrapper).exists()).toBe(false)
    })

    it('reinicia el formulario al abrir otro cobro', async () => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValue(historial(1))
      await boton(fila(wrapper, 'Alfa SA'), 'Cobro').trigger('click')
      await flushPromises()
      await boton(modalCobro(wrapper), 'Transferencia').trigger('click')
      await modalCobro(wrapper).find('button[aria-label="Cerrar"]').trigger('click')
      await boton(fila(wrapper, 'Epsilon'), 'Cobro').trigger('click')
      await flushPromises()
      expect(boton(modalCobro(wrapper), 'Efectivo').classes()).toContain('cash-payment__option--active')
      expect(modalCobro(wrapper).find('p').text()).toBe('Epsilon')
    })
  })

  describe('historial de movimientos', () => {
    const movimientosHistorial = [
      movimiento(1, 'CUOTA', '2025-01-05', { fechaVencimiento: '2025-01-31', pendiente: 0 }),
      movimiento(2, 'REINTEGRO', '2025-02-10', { recurrente: true, pendiente: 120, monto: 120 }),
      movimiento(3, 'REINTEGRO', '2025-02-11', { recurrente: false, fechaVencimiento: 'sin-fecha' }),
      movimiento(4, 'REINTEGRO', '2025-02-12', { recurrente: null }),
      movimiento(5, 'PAGO', '2025-03-01', {
        metodoPago: 'TRANSFERENCIA', referencia: 'R-9', observaciones: 'Pago adelantado', saldoFavorUtilizado: 50, saldoResultante: -50,
      }),
      movimiento(6, 'PAGO', '2025-03-02', { metodoPago: 'COBRADOR' }),
      movimiento(7, 'PAGO', '2025-03-03', { metodoPago: 'EFECTIVO' }),
    ]

    async function abrirHistorial(datos: HistorialCaja, socio = 'Alfa SA') {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(datos)
      await boton(fila(wrapper, socio), 'Historial').trigger('click')
      await flushPromises()
      return wrapper
    }

    it('lista los movimientos del más reciente al más antiguo con su detalle', async () => {
      const wrapper = await montar()
      const carga = deferred<HistorialCaja>()
      vi.mocked(cajaService.getHistorial).mockReturnValueOnce(carga.promise)
      await boton(fila(wrapper, 'Alfa SA'), 'Historial').trigger('click')
      expect(modalHistorial(wrapper).text()).toContain('Cargando historial...')
      expect(modalHistorial(wrapper).find('h2').text()).toBe('Historial')
      carga.resolve(historial(1, { saldo: 500, deudaVencida: 200, movimientos: movimientosHistorial }))
      await flushPromises()

      const modal = modalHistorial(wrapper)
      expect(modal.find('h2').text()).toBe('Socio 1')
      expect(modal.find('.history-summary').text()).toMatch(/500,00.*200,00/)
      const articulos = modal.findAll('article')
      expect(articulos.map((a) => a.find('strong').text())).toEqual(['PAGO 7', 'PAGO 6', 'PAGO 5', 'REINTEGRO 4', 'REINTEGRO 3', 'REINTEGRO 2', 'CUOTA 1'])
      expect(articulos[0]!.text()).toContain('Efectivo')
      expect(articulos[1]!.text()).toContain('Cobrador')
      expect(articulos[2]!.text()).toContain('Transferencia')
      expect(articulos[2]!.text()).toContain('Referencia: R-9')
      expect(articulos[2]!.text()).toContain('Pago adelantado')
      expect(articulos[2]!.find('.account-credit').text()).toMatch(/Saldo a favor utilizado.*50,00/)
      expect(articulos[2]!.text()).not.toContain('Pendiente:')
      expect(articulos[2]!.find('aside').text()).toMatch(/^-/)
      expect(articulos[3]!.find('.history-entry__tag--tipo').exists()).toBe(false)
      expect(articulos[3]!.text()).toContain('Vence -')
      expect(articulos[4]!.find('.history-entry__tag--tipo').text()).toBe('Puntual')
      expect(articulos[4]!.text()).toContain('Vence sin-fecha')
      expect(articulos[5]!.find('.history-entry__tag--tipo').text()).toBe('Recurrente')
      expect(articulos[5]!.text()).toMatch(/Pendiente: .*120,00/)
      expect(articulos[6]!.find('.history-entry__dot--red').exists()).toBe(true)
      expect(articulos[6]!.find('aside').text()).toMatch(/^\+/)
      expect(articulos[6]!.find('time').text()).toMatch(/2025/)
      expect(modal.find('.historial-contable-stub').text()).toBe('contable 1')
    })

    it('filtra por rango de fechas, valida el rango y permite limpiarlo', async () => {
      const wrapper = await abrirHistorial(historial(1, { movimientos: movimientosHistorial }))
      const modal = modalHistorial(wrapper)
      const [desde, hasta] = modal.findAll('input[type="date"]')
      const limpiar = modal.find('button[aria-label="Limpiar filtro de fechas"]')
      expect(limpiar.attributes('disabled')).toBeDefined()

      await desde!.setValue('2025-02-01')
      expect(modal.findAll('article')).toHaveLength(6)
      await hasta!.setValue('2025-02-11')
      expect(modal.findAll('article').map((a) => a.find('strong').text())).toEqual(['REINTEGRO 3', 'REINTEGRO 2'])

      await desde!.setValue('2025-02-20')
      expect(modal.find('#history-date-error').text()).toContain('La fecha desde no puede ser posterior')
      expect(desde!.attributes('aria-describedby')).toBe('history-date-error')
      expect(modal.findAll('article')).toHaveLength(0)
      expect(modal.text()).not.toContain('No hay movimientos en el rango seleccionado.')

      await desde!.setValue('2024-01-01')
      await hasta!.setValue('2024-12-31')
      expect(modal.text()).toContain('No hay movimientos en el rango seleccionado.')

      await limpiar.trigger('click')
      expect((desde!.element as HTMLInputElement).value).toBe('')
      expect(modal.findAll('article')).toHaveLength(7)
    })

    it('indica cuando el socio no tiene movimientos ni identificación', async () => {
      const wrapper = await abrirHistorial(historial(2, { bps: null, nombreRubro: null }), 'Beta SRL')
      expect(modalHistorial(wrapper).find('header span').text()).toBe('- - Sin rubro')
      expect(modalHistorial(wrapper).text()).toContain('No hay movimientos registrados.')
    })

    it('muestra el error de carga y cierra el modal', async () => {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockRejectedValueOnce(new Error('Historial no disponible'))
      await boton(fila(wrapper, 'Alfa SA'), 'Historial').trigger('click')
      await flushPromises()
      expect(modalHistorial(wrapper).find('[role="alert"]').text()).toContain('Historial no disponible')
      await boton(modalHistorial(wrapper), 'Cerrar').trigger('click')
      expect(modalHistorial(wrapper).exists()).toBe(false)
    })

    it('descarta respuestas de historiales abiertos anteriormente', async () => {
      const wrapper = await montar()
      const primero = deferred<HistorialCaja>()
      const segundo = deferred<HistorialCaja>()
      vi.mocked(cajaService.getHistorial)
        .mockReturnValueOnce(primero.promise)
        .mockReturnValueOnce(segundo.promise)
        .mockResolvedValueOnce(historial(5, { razonSocial: 'Epsilon' }))
      await boton(fila(wrapper, 'Alfa SA'), 'Historial').trigger('click')
      await boton(fila(wrapper, 'Beta SRL'), 'Historial').trigger('click')
      await boton(fila(wrapper, 'Epsilon'), 'Historial').trigger('click')
      await flushPromises()
      expect(modalHistorial(wrapper).find('h2').text()).toBe('Epsilon')

      primero.resolve(historial(1))
      segundo.reject(new Error('Error tardío'))
      await flushPromises()
      expect(modalHistorial(wrapper).find('h2').text()).toBe('Epsilon')
      expect(modalHistorial(wrapper).find('[role="alert"]').exists()).toBe(false)
    })

    it('no reabre el historial si la respuesta llega después de cerrarlo', async () => {
      const wrapper = await montar()
      const carga = deferred<HistorialCaja>()
      vi.mocked(cajaService.getHistorial).mockReturnValueOnce(carga.promise)
      await boton(fila(wrapper, 'Alfa SA'), 'Historial').trigger('click')
      await modalHistorial(wrapper).find('button[aria-label="Cerrar"]').trigger('click')
      expect(modalHistorial(wrapper).exists()).toBe(false)
      carga.resolve(historial(1))
      await flushPromises()
      expect(modalHistorial(wrapper).exists()).toBe(false)
    })

    it('actualiza saldo y resumen tras una anulación contable', async () => {
      const wrapper = await abrirHistorial(historial(1, { saldo: 1000 }))
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1, { saldo: 0 }))
      vi.mocked(cajaService.getResumen).mockResolvedValueOnce(resumen())
      wrapper.findComponent(HistorialContableStub).vm.$emit('actualizado')
      await flushPromises()
      expect(cajaService.getHistorial).toHaveBeenLastCalledWith(1)
      expect(modalHistorial(wrapper).find('.history-summary strong').text()).toMatch(/0,00/)
      expect(cajaService.getResumen).toHaveBeenCalledTimes(2)
    })

    it('no pisa otro historial si cambió el socio durante la actualización', async () => {
      const wrapper = await abrirHistorial(historial(1, { saldo: 1000 }))
      const refresco = deferred<HistorialCaja>()
      vi.mocked(cajaService.getHistorial).mockReturnValueOnce(refresco.promise)
      vi.mocked(cajaService.getResumen).mockResolvedValueOnce(resumen())
      wrapper.findComponent(HistorialContableStub).vm.$emit('actualizado')
      await modalHistorial(wrapper).find('button[aria-label="Cerrar"]').trigger('click')
      refresco.resolve(historial(1, { saldo: 0 }))
      await flushPromises()
      expect(modalHistorial(wrapper).exists()).toBe(false)
      expect(cajaService.getResumen).toHaveBeenCalledTimes(2)
    })

    it('ignora la actualización si el historial no tiene un socio válido', async () => {
      const wrapper = await abrirHistorial(historial(0))
      vi.mocked(cajaService.getHistorial).mockClear()
      wrapper.findComponent(HistorialContableStub).vm.$emit('actualizado')
      await flushPromises()
      expect(cajaService.getHistorial).not.toHaveBeenCalled()
    })

    it('muestra el error si no puede actualizar el saldo tras la anulación', async () => {
      const wrapper = await abrirHistorial(historial(1))
      vi.mocked(cajaService.getHistorial).mockRejectedValueOnce(new Error('Saldo no disponible'))
      wrapper.findComponent(HistorialContableStub).vm.$emit('actualizado')
      await flushPromises()
      expect(modalHistorial(wrapper).find('[role="alert"]').text()).toContain('Saldo no disponible')
    })
  })

  describe('reintegros', () => {
    const programados: ReintegroProgramado[] = [
      { id: 1, concepto: 'Timbre', monto: 100, activo: true },
      { id: 2, concepto: 'Fotocopias', monto: 50, activo: false },
    ]

    async function abrirReintegros(lista: ReintegroProgramado[] = programados) {
      const wrapper = await montar()
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1, { reintegrosProgramados: lista }))
      await boton(fila(wrapper, 'Alfa SA'), 'Reintegro').trigger('click')
      await flushPromises()
      return wrapper
    }

    function entrada(wrapper: Wrapper, concepto: string) {
      const encontrada = modalReintegros(wrapper).findAll('.expense-programmed__entry').find((a) => a.find('strong').text() === concepto)
      if (!encontrada) throw new Error(`No se encontró el reintegro ${concepto}`)
      return encontrada
    }

    async function irARecurrentes(wrapper: Wrapper) {
      await modalReintegros(wrapper).find('#expense-tab-recurrentes').trigger('click')
    }

    it('valida y registra un reintegro puntual', async () => {
      const wrapper = await abrirReintegros()
      const modal = modalReintegros(wrapper)
      expect(modal.find('p').text()).toBe('Alfa SA')
      expect(modal.find('.expense-type-hint strong').text()).toBe('Puntual')

      await modal.find('#expense-panel-gastos').trigger('submit')
      expect(modal.find('[role="alert"]').text()).toBe('Ingrese concepto y monto positivo con hasta dos decimales.')

      const [concepto, importe] = modal.findAll('#expense-panel-gastos input')
      await concepto!.setValue('  Timbre profesional  ')
      await importe!.setValue('250.75')
      const registro = deferred<CuentaCaja>()
      vi.mocked(cajaService.registrarReintegro).mockReturnValueOnce(registro.promise)
      vi.mocked(cajaService.getResumen).mockResolvedValueOnce(resumen())
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1, { reintegrosProgramados: programados }))
      await modal.find('#expense-panel-gastos').trigger('submit')
      expect(boton(modal, 'Guardando...').attributes('disabled')).toBeDefined()
      // Ni un segundo envío ni el fondo interrumpen el registro en curso.
      await modal.find('#expense-panel-gastos').trigger('submit')
      await wrapper.find('.cash-modal-layer').trigger('click')
      expect(modalReintegros(wrapper).exists()).toBe(true)

      registro.resolve(cuentas[0]!)
      await flushPromises()
      expect(cajaService.registrarReintegro).toHaveBeenCalledTimes(1)
      expect(cajaService.registrarReintegro).toHaveBeenCalledWith(1, { concepto: 'Timbre profesional', monto: 250.75, recurrente: false })
      expect(cajaService.getResumen).toHaveBeenCalledTimes(2)
      expect(modalReintegros(wrapper).find('.expense-success').text()).toContain('Reintegro puntual registrado.')
      expect((modalReintegros(wrapper).find('#expense-panel-gastos input').element as HTMLInputElement).value).toBe('')
    })

    it('envía la marca de recurrente al registrar un reintegro mensual', async () => {
      const wrapper = await abrirReintegros()
      const modal = modalReintegros(wrapper)
      const [concepto, importe, recurrente] = modal.findAll('#expense-panel-gastos input')
      await concepto!.setValue('Cuota cámara')
      await importe!.setValue('90')
      await recurrente!.setValue(true)
      expect(modal.find('.expense-type-hint').text()).toContain('queda programado para los siguientes')
      vi.mocked(cajaService.registrarReintegro).mockResolvedValueOnce(cuentas[0]!)
      vi.mocked(cajaService.getResumen).mockResolvedValueOnce(resumen())
      vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1, { reintegrosProgramados: programados }))
      await modal.find('#expense-panel-gastos').trigger('submit')
      await flushPromises()
      expect(cajaService.registrarReintegro).toHaveBeenCalledWith(1, { concepto: 'Cuota cámara', monto: 90, recurrente: true })
      // El mensaje respeta el tipo elegido aunque el formulario se reinicie al recargar el historial.
      expect(modalReintegros(wrapper).find('.expense-success').text()).toContain('Reintegro recurrente registrado.')
    })

    it('muestra el error al registrar el reintegro', async () => {
      const wrapper = await abrirReintegros()
      const modal = modalReintegros(wrapper)
      const [concepto, importe] = modal.findAll('#expense-panel-gastos input')
      await concepto!.setValue('Timbre')
      await importe!.setValue('10')
      vi.mocked(cajaService.registrarReintegro).mockRejectedValueOnce(new Error('Socio inactivo'))
      await modal.find('#expense-panel-gastos').trigger('submit')
      await flushPromises()
      expect(modal.find('[role="alert"]').text()).toContain('Socio inactivo')
      expect(boton(modal, 'Registrar reintegro').attributes('disabled')).toBeUndefined()
    })

    it('muestra la carga y el error al obtener los reintegros', async () => {
      const wrapper = await montar()
      const carga = deferred<HistorialCaja>()
      vi.mocked(cajaService.getHistorial).mockReturnValueOnce(carga.promise)
      await boton(fila(wrapper, 'Alfa SA'), 'Reintegro').trigger('click')
      const modal = modalReintegros(wrapper)
      expect(modal.text()).toContain('Cargando reintegros recurrentes...')
      expect(modal.find('h3').exists()).toBe(false)
      expect(boton(modal, 'Cerrar').attributes('disabled')).toBeDefined()
      carga.reject(new Error('Reintegros no disponibles'))
      await flushPromises()
      expect(modal.find('[role="alert"]').text()).toContain('Reintegros no disponibles')
      expect(modal.text()).not.toContain('No hay reintegros recurrentes registrados.')

      await boton(modal, 'Cerrar').trigger('click')
      expect(modalReintegros(wrapper).exists()).toBe(false)
    })

    it('cambia de pestaña limpiando mensajes y muestra los contadores', async () => {
      const wrapper = await abrirReintegros()
      const modal = modalReintegros(wrapper)
      await modal.find('#expense-panel-gastos').trigger('submit')
      expect(modal.find('[role="alert"]').exists()).toBe(true)

      // Volver a elegir la pestaña activa no limpia nada.
      await modal.find('#expense-tab-gastos').trigger('click')
      expect(modal.find('[role="alert"]').exists()).toBe(true)

      await irARecurrentes(wrapper)
      expect(modal.find('#expense-tab-recurrentes').attributes('aria-selected')).toBe('true')
      expect(modal.find('[role="alert"]').exists()).toBe(false)
      expect(modal.find('.expense-programmed__count').text()).toBe('1 activos · 1 inactivos')
      expect(modal.findAll('footer button')).toHaveLength(1)
      expect(entrada(wrapper, 'Timbre').find('label').text()).toBe('Activo')
      expect(entrada(wrapper, 'Fotocopias').find('input').attributes('aria-label')).toBe('Activar Fotocopias')
    })

    it('indica cuando no hay reintegros recurrentes', async () => {
      const wrapper = await abrirReintegros([])
      await irARecurrentes(wrapper)
      expect(modalReintegros(wrapper).text()).toContain('No hay reintegros recurrentes registrados.')
    })

    it('activa o desactiva un reintegro recurrente desde la casilla', async () => {
      const wrapper = await abrirReintegros()
      await irARecurrentes(wrapper)
      const guardado = deferred<ReintegroProgramado>()
      vi.mocked(cajaService.actualizarProgramado).mockReturnValueOnce(guardado.promise)
      const casilla = entrada(wrapper, 'Timbre').find('input')
      await casilla.setValue(false)
      // La casilla vuelve a su estado real hasta que el servidor confirme.
      expect((casilla.element as HTMLInputElement).checked).toBe(true)
      expect(cajaService.actualizarProgramado).toHaveBeenCalledWith(1, { id: 1, concepto: 'Timbre', monto: 100, activo: false })
      // Mientras se guarda, editar o eliminar no tienen efecto.
      await clickForzado(entrada(wrapper, 'Timbre').find('.expense-programmed__edit'))
      await clickForzado(entrada(wrapper, 'Timbre').find('.expense-programmed__delete'))
      await clickForzado(modalReintegros(wrapper).find('#expense-tab-gastos'))
      expect(entrada(wrapper, 'Timbre').find('form').exists()).toBe(false)
      expect(entrada(wrapper, 'Timbre').find('.expense-programmed__confirmation').exists()).toBe(false)

      guardado.resolve({ id: 1, concepto: 'Timbre', monto: 100, activo: false })
      await flushPromises()
      expect(modalReintegros(wrapper).find('.expense-programmed__count').text()).toBe('0 activos · 2 inactivos')
      expect(modalReintegros(wrapper).find('.expense-success').text()).toContain('Configuración guardada.')
    })

    it('edita un reintegro recurrente validando concepto y monto', async () => {
      const wrapper = await abrirReintegros()
      await irARecurrentes(wrapper)
      await entrada(wrapper, 'Timbre').find('.expense-programmed__edit').trigger('click')
      let formulario = entrada(wrapper, 'Timbre').find('form')
      const [concepto, importe, activo] = formulario.findAll('input')
      expect((importe!.element as HTMLInputElement).value).toBe('100')

      await concepto!.setValue('   ')
      await formulario.trigger('submit')
      expect(modalReintegros(wrapper).find('[role="alert"]').text()).toContain('El reintegro recurrente necesita concepto')
      expect(cajaService.actualizarProgramado).not.toHaveBeenCalled()

      await concepto!.setValue('Timbre anual')
      await importe!.setValue('120')
      await activo!.setValue(false)
      vi.mocked(cajaService.actualizarProgramado).mockResolvedValueOnce({ id: 1, concepto: 'Timbre anual', monto: 120, activo: false })
      await formulario.trigger('submit')
      await flushPromises()
      expect(cajaService.actualizarProgramado).toHaveBeenCalledWith(1, { id: 1, concepto: 'Timbre anual', monto: 120, activo: false })
      expect(entrada(wrapper, 'Timbre anual').find('form').exists()).toBe(false)
      expect(entrada(wrapper, 'Timbre anual').text()).toMatch(/120,00/)

      // Cancelar la edición descarta los cambios.
      await entrada(wrapper, 'Fotocopias').find('.expense-programmed__edit').trigger('click')
      formulario = entrada(wrapper, 'Fotocopias').find('form')
      await boton(formulario, 'Cancelar').trigger('click')
      expect(entrada(wrapper, 'Fotocopias').find('form').exists()).toBe(false)
    })

    it('muestra el error al guardar la configuración', async () => {
      const wrapper = await abrirReintegros()
      await irARecurrentes(wrapper)
      await entrada(wrapper, 'Fotocopias').find('.expense-programmed__edit').trigger('click')
      vi.mocked(cajaService.actualizarProgramado).mockRejectedValueOnce(new Error('Configuración bloqueada'))
      await entrada(wrapper, 'Fotocopias').find('form').trigger('submit')
      await flushPromises()
      expect(modalReintegros(wrapper).find('[role="alert"]').text()).toContain('Configuración bloqueada')
      expect(entrada(wrapper, 'Fotocopias').find('form').exists()).toBe(true)
    })

    it('elimina un reintegro recurrente solo después de confirmar', async () => {
      const wrapper = await abrirReintegros()
      await irARecurrentes(wrapper)
      await entrada(wrapper, 'Timbre').find('.expense-programmed__edit').trigger('click')
      await entrada(wrapper, 'Timbre').find('.expense-programmed__delete').trigger('click')
      // Pedir la eliminación cierra la edición abierta.
      expect(entrada(wrapper, 'Timbre').find('form').exists()).toBe(false)
      const confirmacion = entrada(wrapper, 'Timbre').find('.expense-programmed__confirmation')
      expect(confirmacion.text()).toContain('«Timbre»')
      await boton(confirmacion, 'Cancelar').trigger('click')
      expect(entrada(wrapper, 'Timbre').find('.expense-programmed__confirmation').exists()).toBe(false)

      await entrada(wrapper, 'Timbre').find('.expense-programmed__delete').trigger('click')
      vi.mocked(cajaService.eliminarProgramado).mockResolvedValueOnce(undefined)
      await boton(entrada(wrapper, 'Timbre'), 'Sí, eliminar').trigger('click')
      await flushPromises()
      expect(cajaService.eliminarProgramado).toHaveBeenCalledWith(1, 1)
      expect(modalReintegros(wrapper).findAll('.expense-programmed__entry')).toHaveLength(1)
      expect(modalReintegros(wrapper).find('.expense-success').text()).toContain('Reintegro recurrente eliminado.')
    })

    it('muestra el error al eliminar y mantiene la confirmación', async () => {
      const wrapper = await abrirReintegros()
      await irARecurrentes(wrapper)
      await entrada(wrapper, 'Fotocopias').find('.expense-programmed__delete').trigger('click')
      vi.mocked(cajaService.eliminarProgramado).mockRejectedValueOnce(new Error('No se puede eliminar'))
      await boton(entrada(wrapper, 'Fotocopias'), 'Sí, eliminar').trigger('click')
      await flushPromises()
      expect(modalReintegros(wrapper).find('[role="alert"]').text()).toContain('No se puede eliminar')
      expect(entrada(wrapper, 'Fotocopias').find('.expense-programmed__confirmation').exists()).toBe(true)

      // Al volver a la pestaña de gastos se limpian edición, confirmación y mensajes.
      await modalReintegros(wrapper).find('#expense-tab-gastos').trigger('click')
      await irARecurrentes(wrapper)
      expect(entrada(wrapper, 'Fotocopias').find('.expense-programmed__confirmation').exists()).toBe(false)
      expect(modalReintegros(wrapper).find('[role="alert"]').exists()).toBe(false)

      await wrapper.find('.cash-modal-layer').trigger('click')
      expect(modalReintegros(wrapper).exists()).toBe(false)
    })
  })
})
