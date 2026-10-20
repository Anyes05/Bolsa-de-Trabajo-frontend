import { request } from './http'
import type { ApplicantProfileCard, SocioCvLink, SocioProfileCv } from './types'

export const socioBolsaService = {
  searchProfiles(rubro?: string) {
    const query = rubro ? `?rubro=${encodeURIComponent(rubro)}` : ''
    return request<ApplicantProfileCard[]>(`/socio/bolsa${query}`)
  },

  listProfileCvs(profileId: number) {
    return request<SocioProfileCv[]>(`/socio/bolsa/${profileId}/cvs`)
  },

  downloadCv(profileId: number, cvId: number) {
    return request<SocioCvLink>(`/socio/bolsa/${profileId}/cvs/${cvId}`)
  },
}