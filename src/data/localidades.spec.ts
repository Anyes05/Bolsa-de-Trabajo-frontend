import { describe, expect, it } from 'vitest'
import { LOCALIDADES_SAN_JOSE, localidadesConActual } from './localidades'

describe('localidades de San José', () => {
  it('devuelve una copia del catálogo cuando no hay valor actual', () => {
    const opciones = localidadesConActual(null)
    expect(opciones).toEqual([...LOCALIDADES_SAN_JOSE])
    expect(opciones).not.toBe(LOCALIDADES_SAN_JOSE)
    expect(localidadesConActual(undefined)).toHaveLength(LOCALIDADES_SAN_JOSE.length)
    expect(localidadesConActual('   ')).toHaveLength(LOCALIDADES_SAN_JOSE.length)
  })

  it('no duplica una localidad que ya está en el catálogo', () => {
    expect(localidadesConActual(' Libertad ')).toEqual([...LOCALIDADES_SAN_JOSE])
  })

  it('agrega primero un valor histórico fuera del catálogo', () => {
    const opciones = localidadesConActual(' Montevideo ')
    expect(opciones[0]).toBe('Montevideo')
    expect(opciones).toHaveLength(LOCALIDADES_SAN_JOSE.length + 1)
  })
})
