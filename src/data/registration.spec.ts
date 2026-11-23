import { describe, expect, it } from 'vitest'
import { fallbackSectors, residenceAreas, wizardSteps } from './registration'
import { LOCALIDADES_SAN_JOSE } from './localidades'

describe('datos del asistente de registro', () => {
  it('usa las localidades de San José como zonas de residencia', () => {
    expect(residenceAreas).toBe(LOCALIDADES_SAN_JOSE)
  })

  it('ofrece rubros de respaldo sin repetidos', () => {
    expect(fallbackSectors).toContain('Ventas')
    expect(new Set(fallbackSectors).size).toBe(fallbackSectors.length)
  })

  it('define los tres pasos del asistente en orden', () => {
    expect(wizardSteps).toEqual(['Datos Personales', 'Primer Perfil', 'CV / Experiencia'])
  })
})
