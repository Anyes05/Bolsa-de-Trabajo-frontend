import { request } from './http'
import { buildQuery, type Page } from './pagination'
import type {
  CajaResumen, CuentaCaja, EstadoMorosidad, HistorialCaja, RegistrarCobroPayload, RegistrarReintegroPayload, ReintegroProgramado,
} from './types'

export type CajaFilter = 'TODOS' | 'DEUDA' | EstadoMorosidad

export type CajaCuentasParams = { q?: string; filtro?: CajaFilter; page?: number; size?: number }

export type HistorialCajaImportFila = {
  filaExcel: number
  periodo: string | null
  montoCuota: number | null
  fechaVencimiento: string | null
  fechaPago: string | null
  montoPagado: number | null
  metodoPago: string | null
  referencia: string | null
  observaciones: string | null
  estado: 'IMPORTABLE' | 'DUPLICADO' | 'ERROR' | 'IMPORTADO' | string
  motivo: string | null
}

export type HistorialCajaImportResumen = {
  total: number
  importables: number
  duplicados: number
  errores: number
  creados: number
}

export type HistorialCajaImportPreview = {
  socioId: number
  razonSocial: string
  resumen: HistorialCajaImportResumen
  filas: HistorialCajaImportFila[]
}

export const cajaService = {
  getResumen() {
    return request<CajaResumen>('/admin/caja')
  },

  /** Búsqueda, filtro y paginación resueltos en el servidor. */
  listarCuentas(params: CajaCuentasParams = {}) {
    return request<Page<CuentaCaja>>(`/admin/caja/cuentas${buildQuery(params)}`)
  },

  /** Cuentas para el Excel, filtradas en el servidor por estados y búsqueda. */
  cuentasExportacion(estados: readonly EstadoMorosidad[], q = '') {
    if (!estados.length) return Promise.resolve<CuentaCaja[]>([])
    return request<CuentaCaja[]>(`/admin/caja/cuentas/exportacion${buildQuery({ estados, q })}`)
  },

  getHistorial(socioId: number) {
    return request<HistorialCaja>(`/admin/caja/socios/${socioId}/historial`)
  },

  previewHistorialImportacion(socioId: number, file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<HistorialCajaImportPreview>(`/admin/caja/socios/${socioId}/historial-importacion/preview`, {
      method: 'POST',
      body,
    })
  },

  importarHistorial(socioId: number, file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<HistorialCajaImportPreview>(`/admin/caja/socios/${socioId}/historial-importacion`, {
      method: 'POST',
      body,
    })
  },

  registrarCobro(payload: RegistrarCobroPayload) {
    return request<CuentaCaja>('/admin/caja/cobros', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  registrarReintegro(socioId: number, payload: RegistrarReintegroPayload) {
    return request<CuentaCaja>(`/admin/caja/socios/${socioId}/reintegros`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  actualizarProgramado(socioId: number, payload: ReintegroProgramado) {
    return request<ReintegroProgramado>(`/admin/caja/socios/${socioId}/reintegros-programados/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  eliminarProgramado(socioId: number, reintegroId: number) {
    return request<void>(`/admin/caja/socios/${socioId}/reintegros-programados/${reintegroId}`, {
      method: 'DELETE',
    })
  },
}