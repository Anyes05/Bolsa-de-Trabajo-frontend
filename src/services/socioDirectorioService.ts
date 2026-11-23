import { request } from './http'
import { buildQuery, type Page } from './pagination'
import type { EstadoMorosidad } from './types'

export type DirectorioSocio = {
  id: number
  razonSocial: string
  rubro: string
  telefono: string | null
  email: string | null
  estadoMorosidad: EstadoMorosidad
  fechaAlta: string | null
  esDirectivo: boolean
}

export const socioDirectorioService = {
  /** Búsqueda, estado y paginación resueltos en el servidor. */
  list(params: { q?: string; estado?: EstadoMorosidad | null; page?: number; size?: number } = {}) {
    return request<Page<DirectorioSocio>>(`/socio/directorio${buildQuery(params)}`)
  },
}
