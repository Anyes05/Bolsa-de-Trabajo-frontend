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

  it('sends search, filter and page of accounts to the server', async () => {
    await cajaService.listarCuentas()
    await cajaService.listarCuentas({ q: 'Ñandú & Cía', filtro: 'DEUDA', page: 2, size: 50 })
    expect(request).toHaveBeenNthCalledWith(1, '/admin/caja/cuentas')
    expect(request).toHaveBeenNthCalledWith(2, '/admin/caja/cuentas?q=%C3%91and%C3%BA+%26+C%C3%ADa&filtro=DEUDA&page=2&size=50')
  })

  it('asks the server for export accounts by states and search, and skips the call without states', async () => {
    await cajaService.cuentasExportacion(['AL_DIA', 'MOROSO'], 'acme')
    expect(request).toHaveBeenCalledWith('/admin/caja/cuentas/exportacion?estados=AL_DIA&estados=MOROSO&q=acme')
    vi.mocked(request).mockClear()
    await expect(cajaService.cuentasExportacion([])).resolves.toEqual([])
    expect(request).not.toHaveBeenCalled()
  })

  it('propagates reconciliation conflicts instead of hiding a failed correction', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('Requiere conciliación'))
    await expect(cajaService.anularCuota(42, 7, 'Error')).rejects.toThrow('Requiere conciliación')
  })
})
