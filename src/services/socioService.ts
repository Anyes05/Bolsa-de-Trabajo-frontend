import { request } from './http'
import type { EstadoMorosidad, RubroOption, SocioCreatePayload, SocioRecord, SocioUpdatePayload } from './types'

export const socioService = {
  getSocios() {
    return request<SocioRecord[]>('/admin/socios')
  },

  getSocioById(id: number) {
    return request<SocioRecord>(`/admin/socios/${id}`)
  },

  getRubros() {
    return request<RubroOption[]>('/admin/socios/rubros')
  },

  createSocio(payload: SocioCreatePayload) {
    return request<SocioRecord>('/admin/socios', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateSocio(id: number, payload: SocioUpdatePayload) {
    return request<SocioRecord>(`/admin/socios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deleteSocio(id: number) {
    return request<SocioRecord>(`/admin/socios/${id}`, {
      method: 'DELETE',
    })
  },

  activateSocio(id: number) {
    return request<SocioRecord>(`/admin/socios/${id}/activar`, {
      method: 'POST',
    })
  },
}

export const estadoMorosidadLabel: Record<EstadoMorosidad, string> = {
  AL_DIA: 'Al día',
  DEUDA_A_VENCER: 'Deuda a vencer',
  DEUDA_VENCIDA: 'Deuda vencida',
  INACTIVO: 'Inactivo',
}

export function estadoMorosidadTone(estado: EstadoMorosidad | null | undefined) {
  if (estado === 'AL_DIA') return 'green'
  if (estado === 'DEUDA_A_VENCER') return 'orange'
  return 'red'
}
