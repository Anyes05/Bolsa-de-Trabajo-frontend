import { request } from './http'
import type { ActiveSocioOption, JobOffer, JobOfferPayload, OfferStatus, RubroOption } from './types'

export const offerService = {
  list() {
    return request<JobOffer[]>('/ofertas')
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