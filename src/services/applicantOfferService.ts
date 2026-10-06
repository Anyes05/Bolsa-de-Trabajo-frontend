import { request } from './http'
import type { ApplicantApplication, JobOffer, RubroOption } from './types'

export const applicantOfferService = {
  list(rubroId?: number) {
    const query = rubroId ? `?rubroId=${rubroId}` : ''
    return request<JobOffer[]>(`/postulante/ofertas${query}`)
  },

  listRubros() {
    return request<RubroOption[]>('/postulante/ofertas/rubros')
  },

  listApplications() {
    return request<ApplicantApplication[]>('/postulante/ofertas/postulaciones')
  },

  apply(offerId: number, perfilId: number) {
    return request<ApplicantApplication>(`/postulante/ofertas/${offerId}/postulaciones`, {
      method: 'POST',
      body: JSON.stringify({ perfilId }),
    })
  },
}