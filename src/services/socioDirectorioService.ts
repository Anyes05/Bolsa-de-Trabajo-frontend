import { request } from './http'
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
  list() {
    return request<DirectorioSocio[]>('/socio/directorio')
  },
}
