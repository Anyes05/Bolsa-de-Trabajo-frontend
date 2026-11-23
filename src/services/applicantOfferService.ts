import { request } from './http'
import { buildQuery, type Page } from './pagination'
import type { ApplicantApplication, JobOffer, RubroOption } from './types'

export const applicantOfferService = {
  /** Ofertas activas filtradas por rubro y paginadas en el servidor. */
  list(params: { rubroId?: number | null; page?: number; size?: number } = {}) {
    return request<Page<JobOffer>>(`/postulante/ofertas${buildQuery({ ...params, rubroId: params.rubroId || null })}`)
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