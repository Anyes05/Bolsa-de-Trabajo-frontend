import { describe, expect, it } from 'vitest'
import { buildQuery, emptyApplicantPage, emptyPage } from './pagination'

describe('buildQuery', () => {
  it('omite vacíos, nulos y espacios y repite claves para listas', () => {
    expect(buildQuery({})).toBe('')
    expect(buildQuery({ q: '   ', a: null, b: undefined, c: '' })).toBe('')
    expect(buildQuery({ q: ' acme ', page: 0, ok: false, estados: ['AL_DIA', 'MOROSO'] }))
      .toBe('?q=acme&page=0&ok=false&estados=AL_DIA&estados=MOROSO')
  })

  it('codifica el texto del usuario: no puede inyectar parámetros ni romper la URL', () => {
    expect(buildQuery({ q: 'a&page=999#x?y=1' })).toBe('?q=a%26page%3D999%23x%3Fy%3D1')
    expect(new URLSearchParams(buildQuery({ q: 'a&page=999' }).slice(1)).get('page')).toBeNull()
  })
})

describe('páginas vacías', () => {
  it('representan un listado sin resultados', () => {
    expect(emptyPage()).toEqual({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    expect(emptyPage(5).size).toBe(5)
    expect(emptyApplicantPage()).toEqual({ pagina: emptyPage(), perfiles: 0, rubros: [], disponibilidades: [] })
  })
})
