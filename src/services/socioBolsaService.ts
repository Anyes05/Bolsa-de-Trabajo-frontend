import { request } from './http'
import type { ApplicantProfileCard, SocioCvLink } from './types'

export const socioBolsaService = {
  searchProfiles(rubro?: string) {
    const query = rubro ? `?rubro=${encodeURIComponent(rubro)}` : ''
    return request<ApplicantProfileCard[]>(`/socio/bolsa${query}`)
  },

  downloadCv(profileId: number) {
    return request<SocioCvLink>(`/socio/bolsa/${profileId}/cv`)
  },
}