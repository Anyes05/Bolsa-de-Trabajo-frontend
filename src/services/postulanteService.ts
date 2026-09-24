import { request } from './http'
import type { CvDownloadResponse, CvResponse, ProfessionalProfile } from './types'

function authHeaders(authToken?: string) {
  return authToken ? { Authorization: `Bearer ${authToken}` } : undefined
}

export const postulanteService = {
  listCvs(authToken?: string) {
    return request<CvResponse[]>('/postulante/cvs', {
      headers: authHeaders(authToken),
    })
  },

  uploadCv(file: File, resumen?: string, authToken?: string, profileId?: number) {
    const body = new FormData()
    body.append('file', file)
    if (profileId) body.append('perfilLaboralId', String(profileId))
    if (resumen?.trim()) {
      body.append('resumen', resumen.trim())
    }

    return request<CvResponse>('/postulante/cvs', {
      method: 'POST',
      body,
      headers: authHeaders(authToken),
    })
  },

  listProfiles(authToken?: string) {
    return request<ProfessionalProfile[]>('/postulante/perfiles', {
      headers: authHeaders(authToken),
    })
  },

  updateProfile(profile: ProfessionalProfile, authToken?: string) {
    return request<ProfessionalProfile>(`/postulante/perfiles/${profile.id}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
      headers: authHeaders(authToken),
    })
  },

  activateCv(cvId: number, authToken?: string) {
    return request<CvResponse>(`/postulante/cvs/${cvId}/activar`, {
      method: 'PATCH',
      headers: authHeaders(authToken),
    })
  },

  deleteCv(cvId: number, authToken?: string) {
    return request<void>(`/postulante/cvs/${cvId}`, {
      method: 'DELETE',
      headers: authHeaders(authToken),
    })
  },

  downloadCv(cvId: number, authToken?: string) {
    return request<CvDownloadResponse>(`/postulante/cvs/${cvId}/download`, {
      headers: authHeaders(authToken),
    })
  },
}
