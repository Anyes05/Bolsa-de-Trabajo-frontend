import { request } from './http'

export type PermanenciaEstado = {
  requiereAccion: boolean
  avisoPendiente: boolean
  ocultoPorRetencion: boolean
  deadline: string | null
}

export const permanenciaService = {
  estado() {
    return request<PermanenciaEstado>('/postulante/permanencia')
  },

  confirmarAutenticado() {
    return request<PermanenciaEstado>('/postulante/permanencia/confirmar', { method: 'POST' })
  },

  confirmarPorToken(token: string) {
    return request<void>('/auth/permanencia/confirmar', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
}
