import { request } from './http'
import type { RubroOption, SocioRecord } from './types'

export type SocioPerfilUpdatePayload = {
  razonSocial: string
  telefono?: string | null
  emailContacto?: string | null
  calle: string
  numero?: string | null
  localidad: string
  rubroId: number
  fechaAniversario?: string | null
}

export const socioPerfilService = {
  get() {
    return request<SocioRecord>('/socio/perfil')
  },

  update(payload: SocioPerfilUpdatePayload) {
    return request<SocioRecord>('/socio/perfil', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  listRubros() {
    return request<RubroOption[]>('/socio/perfil/rubros')
  },
}
