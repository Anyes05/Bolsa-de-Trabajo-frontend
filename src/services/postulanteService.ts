import { request } from './http'
import type { CvDownloadResponse, CvResponse } from './types'

export const postulanteService = {
  listCvs() {
    return request<CvResponse[]>('/postulante/cvs')
  },

  uploadCv(file: File, resumen?: string) {
    const body = new FormData()
    body.append('file', file)
    if (resumen?.trim()) {
      body.append('resumen', resumen.trim())
    }
    return request<CvResponse>('/postulante/cvs', {
      method: 'POST',
      body,
    })
  },

  activateCv(cvId: number) {
    return request<CvResponse>(`/postulante/cvs/${cvId}/activar`, {
      method: 'PATCH',
    })
  },

  deleteCv(cvId: number) {
    return request<void>(`/postulante/cvs/${cvId}`, {
      method: 'DELETE',
    })
  },

  downloadCv(cvId: number) {
    return request<CvDownloadResponse>(`/postulante/cvs/${cvId}/download`)
  },
}
