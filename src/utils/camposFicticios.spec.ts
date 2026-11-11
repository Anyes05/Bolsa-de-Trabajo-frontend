import { describe, expect, it } from 'vitest'
import { isCampoFicticio, labelsCamposFicticios } from './camposFicticios'

describe('camposFicticios', () => {
  it('detecta campo provisional', () => {
    expect(isCampoFicticio(['bps', 'rut'], 'bps')).toBe(true)
    expect(isCampoFicticio(['bps'], 'telefono')).toBe(false)
    expect(isCampoFicticio(undefined, 'bps')).toBe(false)
  })

  it('traduce claves a etiquetas', () => {
    expect(labelsCamposFicticios(['bps', 'fechaAlta'])).toEqual(['BPS', 'Fecha de alta'])
  })
})
