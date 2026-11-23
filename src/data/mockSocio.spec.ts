import { describe, expect, it } from 'vitest'
import { availabilityLabel } from './mockSocioBolsa'
import { mockSocioNotifications } from './mockSocioNotificaciones'
import { mockDirectivoProfile, mockSocioProfile } from './mockSocioPerfil'

describe('datos de ejemplo del módulo socio', () => {
  it('traduce cada disponibilidad a una etiqueta legible', () => {
    expect(availabilityLabel).toEqual({
      FULL_TIME: 'Full-time',
      PART_TIME: 'Part-time',
      INDEFINIDO: 'Cualquier horario',
    })
  })

  it('incluye notificaciones con ids únicos y un único pop-up', () => {
    const ids = mockSocioNotifications.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(mockSocioNotifications.filter((item) => item.popup)).toHaveLength(1)
    expect(mockSocioNotifications.filter((item) => item.unread)).toHaveLength(3)
    expect(mockSocioNotifications.map((item) => item.kind)).toEqual(['asamblea', 'cuota', 'bienvenida', 'mantenimiento'])
  })

  it('define perfiles de socio común y directivo coherentes', () => {
    expect(mockSocioProfile.razonSocial).toBe(mockSocioProfile.fullName)
    expect(mockSocioProfile.initials).toBe('DF')
    expect(mockDirectivoProfile.razonSocial).toBe(mockDirectivoProfile.fullName)
    expect(mockDirectivoProfile.initials).toBe('CP')
    expect(mockDirectivoProfile.bps).toMatch(/^\d{9}$/)
  })
})
