import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { cajaService } from './cajaService'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('historial contable API', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('loads the independent immutable journal without replacing the operational balance', async () => {
    vi.mocked(request).mockResolvedValueOnce([{ id: 8, tipo: 'ANULACION', originalId: 7 }])
    const result = await cajaService.historialContable(42)
    expect(request).toHaveBeenCalledWith('/admin/caja/socios/42/historial-contable')
    expect(result[0]?.originalId).toBe(7)
  })

  it('sends an explicit reason to the append-only cancellation endpoint', async () => {
    await cajaService.anularCuota(42, 7, 'Emisión duplicada')
    expect(request).toHaveBeenCalledWith('/admin/caja/socios/42/cuotas/7/anulacion', {
      method: 'POST',
      body: JSON.stringify({ motivo: 'Emisión duplicada' }),
    })
  })

  it('propagates reconciliation conflicts instead of hiding a failed correction', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('Requiere conciliación'))
    await expect(cajaService.anularCuota(42, 7, 'Error')).rejects.toThrow('Requiere conciliación')
  })
})
