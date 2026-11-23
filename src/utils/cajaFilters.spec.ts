import { describe, expect, it } from 'vitest'
import { estadoMorosidadTone } from '../services/socioService'
import { nextCajaFilterFromMetric } from './cajaFilters'

// El filtrado y la búsqueda de cuentas se resuelven en el backend (CajaService.listarCuentas);
// aquí solo queda la lógica de UI de las métricas.
describe('nextCajaFilterFromMetric', () => {
  it('toggle vuelve a Todos si se repite la métrica', () => {
    expect(nextCajaFilterFromMetric('DEUDA', 'DEUDA')).toBe('TODOS')
    expect(nextCajaFilterFromMetric('TODOS', 'TODOS')).toBe('TODOS')
    expect(nextCajaFilterFromMetric('TODOS', 'DEUDA')).toBe('DEUDA')
    expect(nextCajaFilterFromMetric('DEUDA', 'INACTIVO')).toBe('INACTIVO')
  })
})

describe('estadoMorosidadTone', () => {
  it('MOROSO es amarillo', () => {
    expect(estadoMorosidadTone('MOROSO')).toBe('yellow')
    expect(estadoMorosidadTone('AL_DIA')).toBe('green')
    expect(estadoMorosidadTone('INACTIVO')).toBe('red')
  })
})
