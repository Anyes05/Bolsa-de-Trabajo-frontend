import { describe, expect, it } from 'vitest'
import { cajaExportRangeError, filterCajaExportMovements } from './cajaExportRange'

describe('rango de exportación de caja', () => {
  it('acepta un rango vacío, parcial o coherente', () => {
    expect(cajaExportRangeError({})).toBe('')
    expect(cajaExportRangeError({ desde: '', hasta: '' })).toBe('')
    expect(cajaExportRangeError({ desde: '2024-01-01' })).toBe('')
    expect(cajaExportRangeError({ hasta: '2024-12-31' })).toBe('')
    expect(cajaExportRangeError({ desde: '2024-02-29', hasta: '2024-02-29' })).toBe('')
  })

  it('rechaza fechas con formato inválido o inexistentes', () => {
    expect(cajaExportRangeError({ desde: '01/02/2024' })).toBe('Ingresá fechas válidas.')
    expect(cajaExportRangeError({ hasta: '2023-02-29' })).toBe('Ingresá fechas válidas.')
    expect(cajaExportRangeError({ desde: '2024-13-01' })).toBe('Ingresá fechas válidas.')
    expect(cajaExportRangeError({ desde: '2024-01-01', hasta: 'abc' })).toBe('Ingresá fechas válidas.')
  })

  it('rechaza un rango invertido', () => {
    expect(cajaExportRangeError({ desde: '2024-05-02', hasta: '2024-05-01' }))
      .toBe('La fecha Desde no puede ser posterior a Hasta.')
  })

  it('filtra movimientos por fecha inclusive usando solo la parte de la fecha', () => {
    const items = [
      { id: 1, fecha: '2024-01-31T23:59:00' },
      { id: 2, fecha: '2024-02-01T00:00:00' },
      { id: 3, fecha: '2024-02-29' },
      { id: 4, fecha: '2024-03-01T10:00:00' },
    ]
    expect(filterCajaExportMovements(items, { desde: '2024-02-01', hasta: '2024-02-29' }).map((i) => i.id)).toEqual([2, 3])
    expect(filterCajaExportMovements(items, { desde: '2024-02-29' }).map((i) => i.id)).toEqual([3, 4])
    expect(filterCajaExportMovements(items, { hasta: '2024-01-31' }).map((i) => i.id)).toEqual([1])
    expect(filterCajaExportMovements(items, {})).toHaveLength(4)
  })

  it('lanza el error de validación en lugar de filtrar con un rango inválido', () => {
    expect(() => filterCajaExportMovements([], { desde: '2024-03-02', hasta: '2024-03-01' }))
      .toThrow('La fecha Desde no puede ser posterior a Hasta.')
  })
})
