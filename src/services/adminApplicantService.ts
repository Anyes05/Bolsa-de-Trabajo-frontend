import { request } from './http'
import type { AdminApplicantProfile, SocioCvLink, SocioProfileCv } from './types'

export const adminApplicantService = {
  list() {
    return request<AdminApplicantProfile[]>('/admin/postulantes')
  },

  listProfileCvs(profileId: number) {
    return request<SocioProfileCv[]>(`/admin/postulantes/${profileId}/cvs`)
  },

  downloadCv(profileId: number, cvId: number) {
    return request<SocioCvLink>(`/admin/postulantes/${profileId}/cvs/${cvId}`)
  },
}