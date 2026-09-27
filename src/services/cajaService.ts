import { request } from './http'
import type { CajaResumen, CuentaCaja, HistorialCaja, RegistrarCobroPayload } from './types'

export const cajaService = {
  getResumen() {
    return request<CajaResumen>('/admin/caja')
  },

  getHistorial(socioId: number) {
    return request<HistorialCaja>(`/admin/caja/socios/${socioId}/historial`)
  },

  registrarCobro(payload: RegistrarCobroPayload) {
    return request<CuentaCaja>('/admin/caja/cobros', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}