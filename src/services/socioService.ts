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

  resetClaveProvisional(id: number) {
    return request<SocioRecord>(`/admin/socios/${id}/clave-provisional`, {
      method: 'POST',
    })
  },
}

export const estadoMorosidadLabel: Record<EstadoMorosidad, string> = {
  AL_DIA: 'Al día',
  MOROSO: 'Moroso',
  INACTIVO: 'Inactivo',
}

export function estadoMorosidadTone(estado: EstadoMorosidad | null | undefined) {
  if (estado === 'AL_DIA') return 'green'
  if (estado === 'MOROSO') return 'yellow'
  if (estado === 'INACTIVO') return 'red'
  return 'gray'
}

export function socioIdentificadorLabel(socio: { tipoIdentificador?: string | null; bps?: string | null; cedula?: string | null }) {
  if (socio.tipoIdentificador === 'CEDULA' || (!socio.bps && socio.cedula)) {
    return `Cédula ${socio.cedula}`
  }
  if (socio.bps) {
    return `BPS ${socio.bps}`
  }
  return 'Sin identificador'
}

export function socioIdentificadorValue(socio: { bps?: string | null; cedula?: string | null }) {
  return socio.bps || socio.cedula || ''
}
