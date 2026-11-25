import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { cajaService } from './cajaService'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('API operativa de caja', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset()
    vi.mocked(request).mockResolvedValue(undefined)
  })

  it('obtiene el resumen general de caja', async () => {
    vi.mocked(request).mockResolvedValueOnce({ totalSocios: 3, cuentas: [] })
    await expect(cajaService.getResumen()).resolves.toMatchObject({ totalSocios: 3 })
    expect(request).toHaveBeenCalledWith('/admin/caja')
  })

  it('obtiene el historial operativo del socio', async () => {
    vi.mocked(request).mockResolvedValueOnce({ socioId: 9, movimientos: [] })
    await expect(cajaService.getHistorial(9)).resolves.toMatchObject({ socioId: 9 })
    expect(request).toHaveBeenCalledWith('/admin/caja/socios/9/historial')
  })

  it('previsualiza e importa un Excel de historial asociado al socio', async () => {
    const file = new File(['excel'], 'historial.xlsx')
    await cajaService.previewHistorialImportacion(9, file)
    await cajaService.importarHistorial(9, file)

    const [previewUrl, previewOptions] = vi.mocked(request).mock.calls[0]!
    expect(previewUrl).toBe('/admin/caja/socios/9/historial-importacion/preview')
    expect(previewOptions?.method).toBe('POST')
    expect((previewOptions?.body as FormData).get('file')).toBe(file)

    const [importUrl, importOptions] = vi.mocked(request).mock.calls[1]!
    expect(importUrl).toBe('/admin/caja/socios/9/historial-importacion')
    expect(importOptions?.method).toBe('POST')
    expect((importOptions?.body as FormData).get('file')).toBe(file)
  })

  it('registra un cobro con POST', async () => {
    const payload = { socioId: 4, metodoPago: 'EFECTIVO' as const, montoRecibido: 500, nroCobranzaExterno: null, observaciones: null }
    await cajaService.registrarCobro(payload)
    expect(request).toHaveBeenCalledWith('/admin/caja/cobros', { method: 'POST', body: JSON.stringify(payload) })
  })

  it('registra un reintegro para el socio indicado', async () => {
    const payload = { concepto: 'Timbre', monto: 120, recurrente: true }
    await cajaService.registrarReintegro(4, payload)
    expect(request).toHaveBeenCalledWith('/admin/caja/socios/4/reintegros', { method: 'POST', body: JSON.stringify(payload) })
  })

  it('actualiza un reintegro programado usando su id en la ruta', async () => {
    const payload = { id: 17, concepto: 'Timbre', monto: 150, activo: false }
    vi.mocked(request).mockResolvedValueOnce(payload)
    await expect(cajaService.actualizarProgramado(4, payload)).resolves.toEqual(payload)
    expect(request).toHaveBeenCalledWith('/admin/caja/socios/4/reintegros-programados/17', { method: 'PUT', body: JSON.stringify(payload) })
  })

  it('elimina un reintegro programado con DELETE', async () => {
    await cajaService.eliminarProgramado(4, 17)
    expect(request).toHaveBeenCalledWith('/admin/caja/socios/4/reintegros-programados/17', { method: 'DELETE' })
  })
})
