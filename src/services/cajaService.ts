import { request } from './http'
import type { CajaResumen, CuentaCaja, HistorialCaja, RegistrarCobroPayload, RegistrarReintegroPayload, ReintegroProgramado } from './types'

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

  registrarReintegro(socioId: number, payload: RegistrarReintegroPayload) {
    return request<CuentaCaja>(`/admin/caja/socios/${socioId}/reintegros`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  actualizarProgramado(socioId: number, payload: ReintegroProgramado) {
    return request<ReintegroProgramado>(`/admin/caja/socios/${socioId}/reintegros-programados/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  eliminarProgramado(socioId: number, reintegroId: number) {
    return request<void>(`/admin/caja/socios/${socioId}/reintegros-programados/${reintegroId}`, {
      method: 'DELETE',
    })
  },
}