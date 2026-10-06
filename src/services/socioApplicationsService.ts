import { request } from './http'
import type { ApplicantApplication, ReceivedApplication, SocioCvLink } from './types'

export const socioApplicationsService = {
  list(offerId: number) {
    return request<ReceivedApplication[]>(`/socio/ofertas/${offerId}/postulaciones`)
  },

  updateStatus(applicationId: number, status: ApplicantApplication['estado']) {
    return request<{ id: number; status: ApplicantApplication['estado'] }>(
      `/socio/postulaciones/${applicationId}/estado?estado=${status}`,
      { method: 'PATCH' },
    )
  },

  downloadCv(applicationId: number) {
    return request<SocioCvLink>(`/socio/postulaciones/${applicationId}/cv`)
  },
}