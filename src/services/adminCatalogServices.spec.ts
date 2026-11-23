import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { catalogService } from './catalogService'
import { comunicadoService, destinatarioLabel, type DestinatarioComunicado } from './comunicadoService'
import { rubroService } from './rubroService'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('servicios administrativos de catálogos y comunicados', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('consulta los sectores del catálogo público', async () => {
    vi.mocked(request).mockResolvedValueOnce(['Comercio'])

    await expect(catalogService.getSectors()).resolves.toEqual(['Comercio'])
    expect(request).toHaveBeenCalledWith('/sectors')
  })

  it('lista rubros incluyendo o excluyendo inactivos, con búsqueda y página en el servidor', async () => {
    await rubroService.list()
    await rubroService.list({ incluirInactivos: false })
    await rubroService.list({ q: 'Ind & co', page: 2, size: 10 })

    expect(request).toHaveBeenNthCalledWith(1, '/admin/rubros?incluirInactivos=true')
    expect(request).toHaveBeenNthCalledWith(2, '/admin/rubros?incluirInactivos=false')
    expect(request).toHaveBeenNthCalledWith(3, '/admin/rubros?incluirInactivos=true&q=Ind+%26+co&page=2&size=10')
  })

  it('crea, renombra y activa rubros con los contratos HTTP esperados', async () => {
    await rubroService.create('Industria')
    await rubroService.update(4, 'Industria pesada')
    await rubroService.setActivo(4, false)

    expect(request).toHaveBeenNthCalledWith(1, '/admin/rubros', {
      method: 'POST',
      body: JSON.stringify({ nombreRubro: 'Industria' }),
    })
    expect(request).toHaveBeenNthCalledWith(2, '/admin/rubros/4', {
      method: 'PUT',
      body: JSON.stringify({ nombreRubro: 'Industria pesada' }),
    })
    expect(request).toHaveBeenNthCalledWith(3, '/admin/rubros/4/activo', {
      method: 'PUT',
      body: JSON.stringify({ activo: false }),
    })
  })

  it('lista comunicados, consulta la audiencia y publica uno nuevo', async () => {
    const payload = { titulo: 'Aviso', contenido: 'Texto', destinatario: 'SOCIOS' as const, popup: true }

    await comunicadoService.list()
    await comunicadoService.audiencia()
    await comunicadoService.publish(payload)

    expect(request).toHaveBeenNthCalledWith(1, '/admin/comunicados')
    expect(request).toHaveBeenNthCalledWith(2, '/admin/comunicados/audiencia')
    expect(request).toHaveBeenNthCalledWith(3, '/admin/comunicados', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it.each([
    ['SOLO_DIRECTIVOS', 'Socios Directivos'],
    ['SOCIOS', 'Todos los socios'],
    ['TODOS', 'Todos los socios'],
    ['POSTULANTES', 'Postulantes'],
  ] as const)('traduce el destinatario %s', (valor, etiqueta) => {
    expect(destinatarioLabel(valor)).toBe(etiqueta)
  })

  it('devuelve el valor original si el destinatario es desconocido', () => {
    expect(destinatarioLabel('EMPRESAS' as DestinatarioComunicado)).toBe('EMPRESAS')
  })
})
