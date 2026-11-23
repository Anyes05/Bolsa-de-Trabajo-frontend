// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExcelJS from 'exceljs'
import { sociosExcelService } from './sociosExcelService'
import type { SocioRecord } from './types'

function socio(id: number, extra: Partial<SocioRecord> = {}): SocioRecord {
  return {
    id, bps: `10000000${id}`, cedula: null, tipoIdentificador: 'BPS', razonSocial: `Socio ${id}`, rut: '211111110011',
    telefono: '099123456', emailContacto: `contacto${id}@mail.com`, emailUsuario: `cuenta${id}@mail.com`, fotoUrl: null,
    calle: 'Artigas', numero: '123', localidad: 'San José de Mayo', rubroId: 1, nombreRubro: 'Comercio',
    estadoMorosidad: 'AL_DIA', esDirectivo: false, fechaAlta: '2020-01-15', fechaBaja: null,
    fechaAniversario: '2020-03-01T10:00:00', activo: true, ...extra,
  }
}

let blobParts: unknown[] = []
let blobOptions: BlobPropertyBag | undefined
let enlaces: HTMLAnchorElement[] = []
let revocar: (() => void) | null = null

async function hojaDescargada() {
  const libro = new ExcelJS.Workbook()
  const datos = blobParts[0] as Uint8Array
  await libro.xlsx.load(datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) as ArrayBuffer)
  return libro.getWorksheet('Socios')!
}

describe('exportación Excel de socios', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2025-03-15T15:00:00Z'))
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
    URL.createObjectURL = vi.fn(() => 'blob:socios')
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

  it('genera el libro con encabezados, filas formateadas y lo descarga', async () => {
    await sociosExcelService.download([
      socio(1, { esDirectivo: true }),
      socio(2, {
        bps: null, cedula: '12345678', estadoMorosidad: 'MOROSO', activo: false,
        fechaBaja: '2024-12-31', fechaAlta: 'fecha-invalida', fechaAniversario: null,
      }),
      socio(3, { estadoMorosidad: 'INACTIVO' }),
    ])

    expect(blobOptions).toEqual({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0].download).toBe('socios-2025-03-15.xlsx')
    expect(enlaces[0].href).toBe('blob:socios')
    expect(document.body.contains(enlaces[0])).toBe(false)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    revocar?.()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:socios')

    const hoja = await hojaDescargada()
    expect(hoja.rowCount).toBe(4)
    expect((hoja.getRow(1).values as unknown[]).slice(1)).toEqual([
      'Razón social', 'BPS', 'Cédula', 'RUT', 'Rubro', 'Teléfono', 'Email de contacto', 'Email de cuenta', 'Calle',
      'Número', 'Localidad', 'Estado de morosidad', 'Directivo', 'Fecha de alta', 'Fecha de baja',
      'Fecha de aniversario', 'Activo',
    ])
    const encabezado = hoja.getRow(1).getCell(1)
    expect(encabezado.font?.bold).toBe(true)
    expect(encabezado.fill).toMatchObject({ fgColor: { argb: 'FF08775F' } })
    expect(hoja.getRow(1).height).toBe(32)

    const fila1 = hoja.getRow(2)
    expect(fila1.getCell(1).value).toBe('Socio 1')
    expect(fila1.getCell(12).value).toBe('Al día')
    expect(fila1.getCell(13).value).toBe('Sí')
    expect(fila1.getCell(14).value).toEqual(new Date('2020-01-15T00:00:00Z'))
    expect(fila1.getCell(14).numFmt).toBe('dd/mm/yyyy')
    expect(fila1.getCell(16).value).toEqual(new Date('2020-03-01T00:00:00Z'))
    expect(fila1.getCell(17).value).toBe('Sí')
    expect(fila1.getCell(1).fill).toMatchObject({ fgColor: { argb: 'FFF2F7F5' } })

    const fila2 = hoja.getRow(3)
    expect(fila2.getCell(2).value).toBeNull()
    expect(fila2.getCell(3).value).toBe('12345678')
    expect(fila2.getCell(12).value).toBe('Moroso')
    expect(fila2.getCell(13).value).toBe('No')
    expect(fila2.getCell(14).value).toBe('fecha-invalida')
    expect(fila2.getCell(15).value).toEqual(new Date('2024-12-31T00:00:00Z'))
    expect(fila2.getCell(16).value).toBeNull()
    expect(fila2.getCell(17).value).toBe('No')
    // Las filas impares no llevan relleno de color (ExcelJS las relee como patrón "none").
    expect(fila2.getCell(1).fill).not.toMatchObject({ fgColor: expect.anything() })

    expect(hoja.getRow(4).getCell(12).value).toBe('Inactivo')
    expect(hoja.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
  })

  it('descarga un libro solo con encabezados si no hay socios', async () => {
    await sociosExcelService.download([])
    const hoja = await hojaDescargada()
    expect(hoja.rowCount).toBe(1)
    expect(enlaces).toHaveLength(1)
  })
})
