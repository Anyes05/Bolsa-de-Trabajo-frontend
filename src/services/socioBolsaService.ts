import { request } from './http'
import { buildQuery, type ApplicantFilterParams, type ApplicantGroupPage } from './pagination'
import type { ApplicantProfileCard, SocioCvLink, SocioProfileCv } from './types'

export type ContactApplication = {
  ofertaId: number
  ofertaTitulo: string
  perfilId: number
  perfilNombre: string
}

export type BolsaOrden = 'RECIENTES' | 'NOMBRE'

export const socioBolsaService = {
  /** Búsqueda, filtros, orden y paginación (por postulante) resueltos en el servidor. */
  searchProfiles(params: ApplicantFilterParams & { orden?: BolsaOrden } = {}) {
    return request<ApplicantGroupPage<ApplicantProfileCard>>(`/socio/bolsa${buildQuery(params)}`)
  },

  listProfileCvs(profileId: number) {
    return request<SocioProfileCv[]>(`/socio/bolsa/${profileId}/cvs`)
  },

  downloadCv(profileId: number, cvId: number) {
    return request<SocioCvLink>(`/socio/bolsa/${profileId}/cvs/${cvId}`)
  },

  listContactApplications(applicantId: number) {
    return request<ContactApplication[]>(`/socio/bolsa/postulantes/${applicantId}/postulaciones`)
  },

  notifyApplicant(profileId: number, selected: boolean, ofertaId: number) {
    return request<{ message: string }>(`/socio/bolsa/${profileId}/notificacion`, {
      method: 'POST',
      body: JSON.stringify({ selected, ofertaId }),
    })
  },
}