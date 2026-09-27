import { request } from './http'
import type { FacturacionGenerada, GuardarTarifaPayload, Tarifa } from './types'

export const tarifaService = {
  list() {
    return request<Tarifa[]>('/admin/tarifas')
  },

  save(payload: GuardarTarifaPayload) {
    return request<Tarifa>('/admin/tarifas', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  generateBilling(periodo: string) {
    return request<FacturacionGenerada>('/admin/tarifas/facturacion', {
      method: 'POST',
      body: JSON.stringify({ periodo }),
    })
  },
}