import { request } from './http'
import { buildQuery, type Page } from './pagination'
import type { ActiveSocioOption, JobOffer, JobOfferPayload, OfferStatus, RubroOption } from './types'

export const offerService = {
  /** Búsqueda (título, socio, rubro), estado y paginación resueltos en el servidor. */
  list(params: { q?: string; estado?: OfferStatus | null; page?: number; size?: number } = {}) {
    return request<Page<JobOffer>>(`/ofertas${buildQuery(params)}`)
  },

  /** Una oferta por id (el socio solo puede obtener las propias). */
  get(id: number) {
    return request<JobOffer>(`/ofertas/${id}`)
  },

  listActiveSocios() {
    return request<ActiveSocioOption[]>('/ofertas/socios-activos')
  },

  listRubros() {
    return request<RubroOption[]>('/ofertas/rubros')
  },

  create(payload: JobOfferPayload) {
    return request<JobOffer>('/ofertas', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: number, payload: JobOfferPayload) {
    return request<JobOffer>(`/ofertas/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  },

  setStatus(id: number, status: OfferStatus) {
    return request<JobOffer>(`/ofertas/${id}/estado?estado=${status}`, { method: 'PATCH' })
  },
}