import type { CuentaCaja, EstadoMorosidad } from '../services/types'

export type CajaFilter = 'TODOS' | 'DEUDA' | EstadoMorosidad

export function matchesCajaFilter(company: Pick<CuentaCaja, 'estadoMorosidad' | 'saldo'>, filter: CajaFilter): boolean {
  if (filter === 'TODOS') return true
  if (filter === 'DEUDA') return company.saldo > 0
  return company.estadoMorosidad === filter
}

export function matchesCajaQuery(
  company: Pick<CuentaCaja, 'razonSocial' | 'rut' | 'cedula' | 'nombreRubro' | 'telefono'>,
  query: string,
): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return [company.razonSocial, company.rut, company.cedula, company.nombreRubro, company.telefono]
    .some((value) => (value ?? '').toLowerCase().includes(term))
}

/** Click en métrica: si ya está activa (y no es Todos), vuelve a Todos. */
export function nextCajaFilterFromMetric(current: CajaFilter, next: CajaFilter): CajaFilter {
  return current === next && next !== 'TODOS' ? 'TODOS' : next
}
