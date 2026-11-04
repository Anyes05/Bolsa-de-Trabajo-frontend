import { request } from './http'

export type SocioNotificationRecord = {
  id: number
  titulo: string
  cuerpo: string
  leida: boolean
  popup: boolean
  createdAt: string | null
  comunicadoId: number | null
}

export const socioNotificationService = {
  list() {
    return request<SocioNotificationRecord[]>('/socio/notificaciones')
  },

  markAllRead() {
    return request<void>('/socio/notificaciones/marcar-leidas', { method: 'POST' })
  },

  dismissPopup() {
    return request<void>('/socio/notificaciones/descartar-popup', { method: 'POST' })
  },
}
