import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { tarifaService } from './tarifaService'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('API de tarifas', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('lista las tarifas del administrador', async () => {
    vi.mocked(request).mockResolvedValueOnce([{ id: 1, anio: 2024, montoBase: 1500 }])
    const result = await tarifaService.list()
    expect(request).toHaveBeenCalledWith('/admin/tarifas')
    expect(result[0]?.montoBase).toBe(1500)
  })

  it('guarda la tarifa con PUT y el payload serializado', async () => {
    vi.mocked(request).mockResolvedValueOnce({ id: 2, anio: 2025, montoBase: 1800 })
    const payload = { anio: 2025, montoBase: 1800, diaVencimiento: 31 }
    await expect(tarifaService.save(payload)).resolves.toMatchObject({ id: 2 })
    expect(request).toHaveBeenCalledWith('/admin/tarifas', { method: 'PUT', body: JSON.stringify(payload) })
  })

  it('genera la facturación del período indicado', async () => {
    vi.mocked(request).mockResolvedValueOnce({ periodo: '2025-03', cuotasGeneradas: 10 })
    const result = await tarifaService.generateBilling('2025-03')
    expect(request).toHaveBeenCalledWith('/admin/tarifas/facturacion', {
      method: 'POST',
      body: JSON.stringify({ periodo: '2025-03' }),
    })
    expect(result.cuotasGeneradas).toBe(10)
  })

  it('propaga los errores del servidor', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('Tarifa con cuotas generadas'))
    await expect(tarifaService.save({ anio: 2024, montoBase: 1, diaVencimiento: 31 })).rejects.toThrow('Tarifa con cuotas generadas')
  })
})
