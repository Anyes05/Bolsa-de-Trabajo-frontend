import { request } from './http'
import { buildQuery, type Page } from './pagination'

export type RubroAdmin = {
  id: number
  nombreRubro: string
  activo: boolean
}

/** Página del catálogo; {@code activos} cuenta sobre todo el catálogo, no solo la página. */
export type RubroPage = { pagina: Page<RubroAdmin>; activos: number }

export const rubroService = {
  /** Búsqueda por nombre y paginación resueltas en el servidor. */
  list(params: { incluirInactivos?: boolean; q?: string; page?: number; size?: number } = {}) {
    return request<RubroPage>(`/admin/rubros${buildQuery({ incluirInactivos: params.incluirInactivos ?? true, q: params.q, page: params.page, size: params.size })}`)
  },

  create(nombreRubro: string) {
    return request<RubroAdmin>('/admin/rubros', {
      method: 'POST',
      body: JSON.stringify({ nombreRubro }),
    })
  },

  update(id: number, nombreRubro: string) {
    return request<RubroAdmin>(`/admin/rubros/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombreRubro }),
    })
  },

  setActivo(id: number, activo: boolean) {
    return request<RubroAdmin>(`/admin/rubros/${id}/activo`, {
      method: 'PUT',
      body: JSON.stringify({ activo }),
    })
  },
}
