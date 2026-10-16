import { request } from './http'

export type RubroAdmin = {
  id: number
  nombreRubro: string
  activo: boolean
}

export const rubroService = {
  list(incluirInactivos = true) {
    return request<RubroAdmin[]>(`/admin/rubros?incluirInactivos=${incluirInactivos}`)
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
