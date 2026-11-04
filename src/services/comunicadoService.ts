import { request } from './http'

export type DestinatarioComunicado = 'SOCIOS' | 'SOLO_DIRECTIVOS' | 'TODOS' | 'POSTULANTES'

export type ComunicadoRecord = {
  id: number
  titulo: string
  contenido: string
  destinatario: DestinatarioComunicado
  fechaPublicacion: string | null
  autorEmail: string | null
  destinatariosNotificados: number
  correosEnviados: number
  correosFallidos: number
}

export type AudienciaCounts = {
  sociosActivos: number
  sociosDirectivos: number
}

export type ComunicadoCreatePayload = {
  titulo: string
  contenido: string
  destinatario: 'SOCIOS' | 'SOLO_DIRECTIVOS'
}

export const comunicadoService = {
  list() {
    return request<ComunicadoRecord[]>('/admin/comunicados')
  },

  audiencia() {
    return request<AudienciaCounts>('/admin/comunicados/audiencia')
  },

  publish(payload: ComunicadoCreatePayload) {
    return request<ComunicadoRecord>('/admin/comunicados', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export function destinatarioLabel(value: DestinatarioComunicado) {
  if (value === 'SOLO_DIRECTIVOS') return 'Socios Directivos'
  if (value === 'SOCIOS' || value === 'TODOS') return 'Todos los socios'
  if (value === 'POSTULANTES') return 'Postulantes'
  return value
}
