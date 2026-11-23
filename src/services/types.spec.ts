import { describe, expect, it } from 'vitest'

describe('services/types', () => {
  // types.ts solo declara tipos: en tiempo de ejecución el módulo queda vacío.
  // Se carga para que la cobertura lo mida como lo que es: un módulo sin código ejecutable.
  it('es un módulo solo de tipos, sin valores exportados', async () => {
    const modulo = await import('./types')
    expect(Object.keys(modulo)).toEqual([])
  })
})
