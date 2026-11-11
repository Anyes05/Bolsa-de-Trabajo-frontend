import { request } from './http'
import type { CredencialesEnviadas, EstadoMorosidad, RubroOption, SocioCreatePayload, SocioRecord, SocioUpdatePayload } from './types'

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

  activateSocio(id: number, fecha: string) {
    return request<SocioRecord>(`/admin/socios/${id}/activar`, {
      method: 'POST',
      body: JSON.stringify({ fecha }),
    })
  },

  subscriptionHistory(id: number) {
    return request<SocioSubscriptionEntry[]>(`/admin/socios/${id}/historial-suscripcion`)
  },

  cancelReentry(id: number) {
    return request<void>(`/admin/socios/${id}/reingreso-programado`, { method: 'DELETE' })
  },

  resetClaveProvisional(id: number) {
    return request<SocioRecord>(`/admin/socios/${id}/clave-provisional`, {
      method: 'POST',
    })
  },

  enviarCredenciales(id: number) {
    return request<CredencialesEnviadas>(`/admin/socios/${id}/enviar-credenciales`, {
      method: 'POST',
    })
  },

  habilitarAcceso(id: number) {
    return request<SocioRecord>(`/admin/socios/${id}/habilitar-acceso`, {
      method: 'POST',
    })
  },

  previewImportacion(file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<ImportacionPreview>('/admin/socios/importacion/preview', { method: 'POST', body })
  },

  confirmarImportacion(file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<ImportacionResultado>('/admin/socios/importacion', { method: 'POST', body })
  },
}

export type ImportacionFila = {
  filaExcel: number
  estado: 'IMPORTABLE' | 'INACTIVO' | 'DUPLICADO' | 'ERROR' | string
  motivo: string | null
  razonSocial: string | null
  bps: string | null
  rut: string | null
  telefono: string | null
  email: string | null
  calle: string | null
  numero: string | null
  localidad: string | null
  rubro: string | null
  fechaAlta: string | null
  fechaAniversario: string | null
  camposFicticios: string[]
  inactivo?: boolean
}

export type ImportacionResumen = {
  total: number
  importables: number
  conFicticios: number
  duplicados: number
  errores: number
  inactivos?: number
  creados: number
}

export type ImportacionPreview = {
  resumen: ImportacionResumen
  filas: ImportacionFila[]
}

export type ImportacionResultado = {
  resumen: ImportacionResumen
  omitidas: ImportacionFila[]
}

export type SocioSubscriptionEntry = {
  id: number
  tipo: 'ALTA' | 'BAJA' | 'REINGRESO' | 'REINGRESO_PROGRAMADO'
  fecha: string
  estado: 'REGISTRADO' | 'PENDIENTE' | 'APLICADO' | 'CANCELADO'
  registradoAt: string
  origen: 'SISTEMA' | 'MIGRACION'
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
