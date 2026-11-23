import { request } from './http'
import { buildQuery, type ApplicantFilterParams, type ApplicantGroupPage } from './pagination'
import type { AdminApplicantProfile, SocioCvLink, SocioProfileCv } from './types'

export type AdminApplicantEstado = 'TODOS' | 'ACTIVO' | 'INACTIVO'

export type AdminApplicantPage = {
  resultado: ApplicantGroupPage<AdminApplicantProfile>
  activos: number
  inactivos: number
  totalPerfiles: number
}

export const adminApplicantService = {
  /** Búsqueda, filtros, estado en bolsa y paginación (por postulante) resueltos en el servidor. */
  list(params: ApplicantFilterParams & { estado?: AdminApplicantEstado } = {}) {
    return request<AdminApplicantPage>(`/admin/postulantes${buildQuery(params)}`)
  },

  listProfileCvs(profileId: number) {
    return request<SocioProfileCv[]>(`/admin/postulantes/${profileId}/cvs`)
  },

  downloadCv(profileId: number, cvId: number) {
    return request<SocioCvLink>(`/admin/postulantes/${profileId}/cvs/${cvId}`)
  },
}
