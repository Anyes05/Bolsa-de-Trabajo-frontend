import { beforeEach, describe, expect, it, vi } from 'vitest'
import { permanenciaService } from './permanenciaService'
import { request } from './http'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('servicio de permanencia en la bolsa', () => {
  const estado = { requiereAccion: true, avisoPendiente: false, ocultoPorRetencion: false, deadline: '2026-12-01' }
  beforeEach(() => {
    vi.mocked(request).mockReset()
    vi.mocked(request).mockResolvedValue(estado)
  })

  it('consulta el estado del postulante autenticado', async () => {
    await expect(permanenciaService.estado()).resolves.toEqual(estado)
    expect(request).toHaveBeenCalledWith('/postulante/permanencia')
  })

  it('confirma la permanencia con la sesión iniciada', async () => {
    await permanenciaService.confirmarAutenticado()
    expect(request).toHaveBeenCalledWith('/postulante/permanencia/confirmar', { method: 'POST' })
  })

  it('confirma la permanencia con el token del enlace del correo', async () => {
    await permanenciaService.confirmarPorToken('tok-123')
    expect(request).toHaveBeenCalledWith('/auth/permanencia/confirmar', {
      method: 'POST', body: JSON.stringify({ token: 'tok-123' }),
    })
  })
})
