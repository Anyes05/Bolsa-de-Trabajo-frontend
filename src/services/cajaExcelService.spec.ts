// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExcelJS from 'exceljs'
import { cajaExcelService } from './cajaExcelService'
import { cajaService } from './cajaService'
import type { CuentaCaja, HistorialCaja, MovimientoCaja } from './types'

vi.mock('./cajaService', () => ({ cajaService: { getHistorial: vi.fn() } }))

function cuenta(socioId: number, extra: Partial<CuentaCaja> = {}): CuentaCaja {
  return {
    socioId, bps: `BPS-${socioId}`, razonSocial: `Socio ${socioId}`, nombreRubro: 'Comercio', telefono: '099',
    estadoMorosidad: 'AL_DIA', cuotaId: null, estadoCuota: null, montoCuota: null, montoTimbre: null,
    timbreRecurrente: false, periodo: null, fechaVencimiento: null, saldo: 0, deudaVencida: 0, rut: null, cedula: null,
    ...extra,
  }
}

function movimiento(id: number, tipo: MovimientoCaja['tipo'], fecha: string, monto: number, pendiente: number, saldoResultante = 0): MovimientoCaja {
  return {
    id, tipo, concepto: tipo, fecha, fechaVencimiento: null, monto, saldoAnterior: 0, saldoResultante,
    saldoFavorUtilizado: 0, pendiente, metodoPago: tipo === 'PAGO' ? 'EFECTIVO' : null, referencia: null,
    observaciones: null, recurrente: null,
  }
}

function historial(socioId: number, extra: Partial<HistorialCaja> = {}): HistorialCaja {
  return {
    socioId, razonSocial: `Socio ${socioId}`, bps: `BPS-${socioId}`, nombreRubro: 'Comercio', estadoMorosidad: 'AL_DIA',
    saldo: 0, deudaVencida: 0, movimientos: [], reintegrosProgramados: [], rut: null, cedula: null, ...extra,
  }
}

let blobParts: unknown[] = []
let blobOptions: BlobPropertyBag | undefined
let enlaces: HTMLAnchorElement[] = []
let revocar: (() => void) | null = null

async function libroDescargado() {
  const libro = new ExcelJS.Workbook()
  const datos = blobParts[0] as Uint8Array
  await libro.xlsx.load(datos.slice().buffer as ArrayBuffer)
  return libro
}

function valores(hoja: ExcelJS.Worksheet) {
  const filas: unknown[][] = []
  hoja.eachRow({ includeEmpty: false }, (fila) => { filas.push((fila.values as unknown[]).slice(1)) })
  return filas
}

describe('exportación Excel del control de caja', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2025-03-15T15:00:00Z'))
    vi.mocked(cajaService.getHistorial).mockReset()
    blobParts = []
    blobOptions = undefined
    enlaces = []
    revocar = null
    vi.stubGlobal('Blob', class {
      constructor(parts: unknown[], options?: BlobPropertyBag) {
        blobParts = parts
        blobOptions = options
      }
    })
    URL.createObjectURL = vi.fn(() => 'blob:caja')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      enlaces.push(this)
      expect(document.body.contains(this)).toBe(true)
    })
    const original = window.setTimeout.bind(window)
    vi.spyOn(window, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      if (ms === 1000) { revocar = fn; return 0 }
      return original(fn, ms)
    }) as typeof window.setTimeout)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('genera resumen y detalle mensual con estados del mes y saldos con signo', async () => {
    vi.mocked(cajaService.getHistorial)
      .mockResolvedValueOnce(historial(1, {
        rut: '21.111.111.111-1', cedula: '1.234.567-8', saldo: 300, deudaVencida: 100, estadoMorosidad: 'MOROSO',
        movimientos: [
          movimiento(1, 'CUOTA', '2025-03-01T10:00:00', 1000, 300, 1000),
          movimiento(2, 'REINTEGRO', '2025-03-02', 200, 0, 1200),
          movimiento(3, 'PAGO', '2025-03-05', 900, 0, 300),
          movimiento(4, 'CUOTA', '2025-02-01', 1000, 0, 0),
        ],
      }))
      .mockResolvedValueOnce(historial(2, {
        bps: null, nombreRubro: null, saldo: -50, movimientos: [movimiento(5, 'CUOTA', '2025-03-01', 1000, 0, -50)],
      }))
      .mockResolvedValueOnce(historial(3, {
        bps: '', saldo: 1000, estadoMorosidad: 'INACTIVO', movimientos: [movimiento(6, 'CUOTA', '2025-03-01', 1000, 1000, 1000)],
      }))
      .mockResolvedValueOnce(historial(4))

    await cajaExcelService.download([cuenta(1), cuenta(2, { telefono: null }), cuenta(3), cuenta(4)])

    expect(cajaService.getHistorial).toHaveBeenCalledTimes(4)
    expect(blobOptions?.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0]!.download).toBe('control-caja-2025-03-15.xlsx')
    expect(enlaces[0]!.href).toBe('blob:caja')
    expect(document.body.contains(enlaces[0]!)).toBe(false)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    revocar!()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:caja')

    const libro = await libroDescargado()
    expect(libro.subject).not.toContain('Movimientos desde')
    const resumen = libro.getWorksheet('Resumen')!
    const filas = valores(resumen)
    expect(filas[0]![0]).toBe('Socio')
    expect(filas[0]![1]).toBe('RUT / Cédula')
    // Socio 1: RUT precedes cédula; deuda 300, mes con cuota parcial y reintegro pagado.
    expect(filas[1]).toEqual(['Socio 1', '21.111.111.111-1', 'Comercio', '099', 'Moroso', -300, 300, 100, 0, '2025-03', 1200, 900, 300, 'Pago parcial'])
    // Socio 2: saldo a favor y cuota cubierta.
    expect(filas[2]).toEqual(['Socio 2', '', '', '', 'Al día', 50, 0, 0, 50, '2025-03', 1000, 1000, 0, 'Pago total'])
    expect(filas[3]!.slice(4)).toEqual(['Inactivo', -1000, 1000, 0, 0, '2025-03', 1000, 0, 1000, 'Pendiente'])
    expect(filas[4]!.slice(5)).toEqual([0, 0, 0, 0, '2025-03', 0, 0, 0, 'Sin cargos emitidos'])
    expect(resumen.getCell(2, 6).numFmt).toContain('[Green]')
    expect(resumen.getCell(1, 1).font?.bold).toBe(true)

    const mensual = valores(libro.getWorksheet('Por mes')!)
    expect(mensual[0]![0]).toBe('RUT: 21.111.111.111-1')
    expect(mensual[1]![0]).toBe('Socio 1')
    expect(mensual[2]).toEqual(['Fecha', 'Mes', 'Debe (UYU)', 'Haber (UYU)', 'Saldo (UYU)'])
    expect(mensual[3]!.slice(1)).toEqual(['2025-03', 1000, 0, -1000])
    expect(mensual[5]!.slice(1)).toEqual(['2025-03', 0, 900, -300])
    expect(mensual[6]!.slice(1)).toEqual(['2025-02', 1000, 0, 0])
    const textos = mensual.map((fila) => fila[0])
    expect(textos).toContain('RUT/Cédula: -')
    expect(textos).not.toContain('Sin movimientos en el período seleccionado')
  })

  it('aplica el rango de fechas al detalle, al asunto y al nombre del archivo', async () => {
    vi.mocked(cajaService.getHistorial)
      .mockResolvedValueOnce(historial(1, { movimientos: [movimiento(1, 'CUOTA', '2025-01-10', 1000, 1000, 1000)] }))
      .mockResolvedValueOnce(historial(2, { movimientos: [movimiento(2, 'PAGO', '2025-03-01', 500, 0, -500)] }))

    await cajaExcelService.download([cuenta(1), cuenta(2)], { desde: '2025-02-01' })

    expect(enlaces[0]!.download).toBe('control-caja-2025-02-01-a-2025-03-15.xlsx')
    const libro = await libroDescargado()
    expect(libro.subject).toContain('Movimientos desde 2025-02-01 hasta la fecha de descarga (inclusive).')
    const mensual = valores(libro.getWorksheet('Por mes')!)
    expect(String(mensual[0]![0])).toContain('Movimientos desde 2025-02-01')
    expect(mensual.map((fila) => fila[0])).toContain('Sin movimientos en el período seleccionado')
    expect(mensual.some((fila) => fila[1] === '2025-01')).toBe(false)
    expect(mensual.some((fila) => fila[1] === '2025-03' && fila[3] === 500)).toBe(true)
  })

  it('usa "inicio" cuando solo se indica la fecha Hasta', async () => {
    vi.mocked(cajaService.getHistorial).mockResolvedValueOnce(historial(1))
    await cajaExcelService.download([cuenta(1)], { hasta: '2025-02-28' })
    expect(enlaces[0]!.download).toBe('control-caja-inicio-a-2025-02-28.xlsx')
    const libro = await libroDescargado()
    expect(libro.subject).toContain('Movimientos desde el inicio hasta 2025-02-28')
  })

  it('rechaza un rango inválido sin consultar historiales ni descargar', async () => {
    await expect(cajaExcelService.download([cuenta(1)], { desde: '2025-03-02', hasta: '2025-03-01' }))
      .rejects.toThrow('La fecha Desde no puede ser posterior a Hasta.')
    expect(cajaService.getHistorial).not.toHaveBeenCalled()
    expect(enlaces).toHaveLength(0)
  })
})
