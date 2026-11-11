import { describe, expect, it } from 'vitest'
import { estadoMorosidadTone } from '../services/socioService'
import type { CuentaCaja } from '../services/types'
import { matchesCajaFilter, matchesCajaQuery, nextCajaFilterFromMetric } from './cajaFilters'

function cuenta(partial: Partial<CuentaCaja> & Pick<CuentaCaja, 'estadoMorosidad' | 'razonSocial'>): CuentaCaja {
  return {
    socioId: 1,
    bps: null,
    rut: null,
    cedula: null,
    nombreRubro: null,
    telefono: null,
    saldo: 0,
    deudaVencida: 0,
    cuotaId: null,
    estadoCuota: null,
    montoCuota: null,
    montoTimbre: null,
    timbreRecurrente: false,
    periodo: null,
    fechaVencimiento: null,
    ...partial,
  }
}

describe('matchesCajaFilter', () => {
  const alDia = cuenta({ socioId: 1, razonSocial: 'Al Día SA', estadoMorosidad: 'AL_DIA', saldo: 2600 })
  const moroso = cuenta({ socioId: 2, razonSocial: 'Moroso SA', estadoMorosidad: 'MOROSO', saldo: 5200 })
  const inactivo = cuenta({ socioId: 3, razonSocial: 'Baja SA', estadoMorosidad: 'INACTIVO', saldo: 1000 })

  it('Con deuda incluye todo saldo pendiente, incluso de socios inactivos', () => {
    expect(matchesCajaFilter(alDia, 'DEUDA')).toBe(true)
    expect(matchesCajaFilter(moroso, 'DEUDA')).toBe(true)
    expect(matchesCajaFilter(inactivo, 'DEUDA')).toBe(true)
  })

  it('Con deuda excluye saldos cero o a favor en cualquier estado', () => {
    for (const company of [alDia, moroso, inactivo]) {
      expect(matchesCajaFilter({ ...company, saldo: 0 }, 'DEUDA')).toBe(false)
      expect(matchesCajaFilter({ ...company, saldo: -100 }, 'DEUDA')).toBe(false)
    }
  })

  it('Todos incluye cualquier estado', () => {
    expect([alDia, moroso, inactivo].every((c) => matchesCajaFilter(c, 'TODOS'))).toBe(true)
  })

  it('filtros por estado exacto', () => {
    expect(matchesCajaFilter(alDia, 'AL_DIA')).toBe(true)
    expect(matchesCajaFilter(moroso, 'AL_DIA')).toBe(false)
    expect(matchesCajaFilter(inactivo, 'INACTIVO')).toBe(true)
  })
})

describe('matchesCajaQuery', () => {
  const company = cuenta({
    razonSocial: 'Los Membrillos SAS',
    rut: '210000000012',
    cedula: null,
    nombreRubro: 'Comercio',
    telefono: '099111222',
    estadoMorosidad: 'AL_DIA',
  })

  it('busca por razón social sin importar mayúsculas', () => {
    expect(matchesCajaQuery(company, 'membrillos')).toBe(true)
    expect(matchesCajaQuery(company, 'xyz')).toBe(false)
  })

  it('query vacía no filtra', () => {
    expect(matchesCajaQuery(company, '   ')).toBe(true)
  })
})

describe('nextCajaFilterFromMetric', () => {
  it('toggle vuelve a Todos si se repite la métrica', () => {
    expect(nextCajaFilterFromMetric('DEUDA', 'DEUDA')).toBe('TODOS')
    expect(nextCajaFilterFromMetric('TODOS', 'TODOS')).toBe('TODOS')
    expect(nextCajaFilterFromMetric('TODOS', 'DEUDA')).toBe('DEUDA')
  })
})

describe('estadoMorosidadTone', () => {
  it('MOROSO es amarillo', () => {
    expect(estadoMorosidadTone('MOROSO')).toBe('yellow')
    expect(estadoMorosidadTone('AL_DIA')).toBe('green')
    expect(estadoMorosidadTone('INACTIVO')).toBe('red')
  })
})
