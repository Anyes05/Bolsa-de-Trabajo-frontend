import { describe, expect, it } from 'vitest'
import { ofertasActivasMock, perfilesMock, postulacionesMock, postulanteDisplay } from './mockPostulanteBolsa'

describe('datos de ejemplo de la bolsa del postulante', () => {
  it('tienen identificadores únicos y campos obligatorios completos', () => {
    for (const lista of [perfilesMock, ofertasActivasMock, postulacionesMock]) {
      const ids = lista.map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    expect(perfilesMock.every((perfil) => perfil.name && ['VISIBLE', 'HIDDEN'].includes(perfil.visibility))).toBe(true)
    expect(ofertasActivasMock.every((oferta) => oferta.title && oferta.company)).toBe(true)
    expect(postulacionesMock.every((postulacion) => postulacion.status === 'Pendiente')).toBe(true)
    expect(postulanteDisplay.initials).toBe('MG')
  })
})
