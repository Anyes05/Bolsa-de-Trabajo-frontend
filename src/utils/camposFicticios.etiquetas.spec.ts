import { describe, expect, it } from 'vitest'
import { CAMPO_FICTICIO_LABEL, isCampoFicticio, labelsCamposFicticios } from './camposFicticios'

describe('etiquetas de campos ficticios', () => {
  it('cubre todos los campos que puede completar la carga masiva', () => {
    expect(Object.keys(CAMPO_FICTICIO_LABEL)).toEqual([
      'bps', 'rut', 'telefono', 'emailContacto', 'emailUsuario', 'calle', 'numero', 'localidad', 'rubro', 'fechaAlta', 'fechaAniversario',
    ])
    expect(labelsCamposFicticios(['numero', 'emailUsuario'])).toEqual(['Nro. de puerta', 'Email de cuenta'])
  })

  it('devuelve la clave tal cual si no tiene etiqueta y lista vacía si no hay campos', () => {
    expect(labelsCamposFicticios(['desconocido', 'rut'])).toEqual(['desconocido', 'RUT'])
    expect(labelsCamposFicticios(null)).toEqual([])
    expect(labelsCamposFicticios(undefined)).toEqual([])
    expect(isCampoFicticio(null, 'bps')).toBe(false)
    expect(isCampoFicticio([], 'bps')).toBe(false)
  })
})
