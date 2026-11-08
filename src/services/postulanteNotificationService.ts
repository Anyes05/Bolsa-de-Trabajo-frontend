import { request } from './http'
import type { SocioNotificationRecord } from './socioNotificationService'

export const postulanteNotificationService = {
  list() {
    return request<SocioNotificationRecord[]>('/postulante/notificaciones')
  },

  markOneRead(id: string | number) {
    return request<SocioNotificationRecord>(`/postulante/notificaciones/${id}/leer`, { method: 'POST' })
  },

  markAllRead() {
    return request<void>('/postulante/notificaciones/marcar-leidas', { method: 'POST' })
  },
}
