import type { CajaFilter } from '../services/cajaService'

export type { CajaFilter }

/** Click en métrica: si ya está activa (y no es Todos), vuelve a Todos. El filtrado lo hace el backend. */
export function nextCajaFilterFromMetric(current: CajaFilter, next: CajaFilter): CajaFilter {
  return current === next && next !== 'TODOS' ? 'TODOS' : next
}
