import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  estadoMorosidadLabel,
  estadoMorosidadTone,
  socioIdentificadorLabel,
  socioIdentificadorValue,
  socioService,
} from './socioService'
import type { SocioCreatePayload, SocioUpdatePayload } from './types'

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('servicio de socios (administración)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ token: 'tok' }) })
    fetchMock = vi.fn().mockImplementation(async () => respuestaJson({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function ultimaLlamada() {
    const [url, opciones] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    return { url, opciones }
  }

  it('consulta listado, detalle, rubros e historial con GET', async () => {
    await expect(socioService.getSocios()).resolves.toEqual({ ok: true })
    expect(ultimaLlamada().url).toBe('/api/admin/socios')
    expect(ultimaLlamada().opciones.method).toBeUndefined()

    await socioService.getSocioById(7)
    expect(ultimaLlamada().url).toBe('/api/admin/socios/7')

    await socioService.getRubros()
    expect(ultimaLlamada().url).toBe('/api/admin/socios/rubros')

    await socioService.subscriptionHistory(9)
    expect(ultimaLlamada().url).toBe('/api/admin/socios/9/historial-suscripcion')
    expect(ultimaLlamada().opciones.headers).toMatchObject({ Authorization: 'Bearer tok' })
  })

  it('crea y actualiza socios enviando el payload como JSON', async () => {
    const alta = { tipoIdentificador: 'BPS', identificador: '123456789', razonSocial: 'Alfa' } as SocioCreatePayload
    await socioService.createSocio(alta)
    expect(ultimaLlamada()).toEqual({
      url: '/api/admin/socios',
      opciones: expect.objectContaining({ method: 'POST', body: JSON.stringify(alta) }),
    })

    const cambios = { razonSocial: 'Beta', rubroId: 2 } as SocioUpdatePayload
    await socioService.updateSocio(3, cambios)
    expect(ultimaLlamada()).toEqual({
      url: '/api/admin/socios/3',
      opciones: expect.objectContaining({ method: 'PUT', body: JSON.stringify(cambios) }),
    })
  })

  it('da de baja, activa con fecha y cancela reingresos', async () => {
    await socioService.deleteSocio(4)
    expect(ultimaLlamada()).toEqual({ url: '/api/admin/socios/4', opciones: expect.objectContaining({ method: 'DELETE' }) })

    await socioService.activateSocio(4, '2025-05-01')
    expect(ultimaLlamada()).toEqual({
      url: '/api/admin/socios/4/activar',
      opciones: expect.objectContaining({ method: 'POST', body: JSON.stringify({ fecha: '2025-05-01' }) }),
    })

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(socioService.cancelReentry(4)).resolves.toBeUndefined()
    expect(ultimaLlamada()).toEqual({
      url: '/api/admin/socios/4/reingreso-programado',
      opciones: expect.objectContaining({ method: 'DELETE' }),
    })
  })

  it('gestiona clave provisional, credenciales y acceso con POST', async () => {
    await socioService.resetClaveProvisional(5)
    expect(ultimaLlamada()).toEqual({ url: '/api/admin/socios/5/clave-provisional', opciones: expect.objectContaining({ method: 'POST' }) })

    await socioService.enviarCredenciales(5)
    expect(ultimaLlamada()).toEqual({ url: '/api/admin/socios/5/enviar-credenciales', opciones: expect.objectContaining({ method: 'POST' }) })

    await socioService.habilitarAcceso(5)
    expect(ultimaLlamada()).toEqual({ url: '/api/admin/socios/5/habilitar-acceso', opciones: expect.objectContaining({ method: 'POST' }) })
  })

  it('sube el Excel como FormData para previsualizar y confirmar la importación', async () => {
    const archivo = new File(['contenido'], 'padron.xlsx')

    await socioService.previewImportacion(archivo)
    let llamada = ultimaLlamada()
    expect(llamada.url).toBe('/api/admin/socios/importacion/preview')
    expect(llamada.opciones.method).toBe('POST')
    expect(llamada.opciones.body).toBeInstanceOf(FormData)
    expect((llamada.opciones.body as FormData).get('file')).toBeInstanceOf(File)
    expect(llamada.opciones.headers).not.toHaveProperty('Content-Type')

    await socioService.confirmarImportacion(archivo)
    llamada = ultimaLlamada()
    expect(llamada.url).toBe('/api/admin/socios/importacion')
    expect(((llamada.opciones.body as FormData).get('file') as File).name).toBe('padron.xlsx')
  })

  it('propaga los errores del backend', async () => {
    fetchMock.mockResolvedValueOnce(respuestaJson({ detail: 'Socio inexistente' }, 404))
    await expect(socioService.getSocioById(99)).rejects.toMatchObject({ status: 404, message: 'Socio inexistente' })
  })
})

describe('utilidades de presentación de socios', () => {
  it('traduce el estado de morosidad a etiqueta y tono', () => {
    expect(estadoMorosidadLabel).toEqual({ AL_DIA: 'Al día', MOROSO: 'Moroso', INACTIVO: 'Inactivo' })
    expect(estadoMorosidadTone('AL_DIA')).toBe('green')
    expect(estadoMorosidadTone('MOROSO')).toBe('yellow')
    expect(estadoMorosidadTone('INACTIVO')).toBe('red')
    expect(estadoMorosidadTone(null)).toBe('gray')
    expect(estadoMorosidadTone(undefined)).toBe('gray')
  })

  it('arma la etiqueta del identificador según BPS o cédula', () => {
    expect(socioIdentificadorLabel({ tipoIdentificador: 'CEDULA', bps: '1', cedula: '12345678' })).toBe('Cédula 12345678')
    expect(socioIdentificadorLabel({ bps: null, cedula: '87654321' })).toBe('Cédula 87654321')
    expect(socioIdentificadorLabel({ tipoIdentificador: 'BPS', bps: '123456789', cedula: '1' })).toBe('BPS 123456789')
    expect(socioIdentificadorLabel({ bps: null, cedula: null })).toBe('Sin identificador')
    expect(socioIdentificadorLabel({})).toBe('Sin identificador')
  })

  it('devuelve el valor del identificador priorizando el BPS', () => {
    expect(socioIdentificadorValue({ bps: '123', cedula: '456' })).toBe('123')
    expect(socioIdentificadorValue({ bps: null, cedula: '456' })).toBe('456')
    expect(socioIdentificadorValue({})).toBe('')
  })
})
