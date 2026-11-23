/** Página devuelta por los listados del backend: búsqueda y filtros ya aplicados en el servidor. */
export type Page<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 20

export type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number>

/** Arma el query string omitiendo vacíos. URLSearchParams codifica cada valor: no se concatena texto del usuario. */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)))
      continue
    }
    const text = String(value).trim()
    if (text) search.append(key, text)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function emptyPage<T>(size = DEFAULT_PAGE_SIZE): Page<T> {
  return { content: [], page: 0, size, totalElements: 0, totalPages: 0 }
}

/** Perfiles de un mismo postulante: el servidor pagina por postulante para no partirlo entre páginas. */
export type ApplicantGroupPage<T> = {
  pagina: Page<{ applicantId: number; profiles: T[] }>
  /** Perfiles que coinciden con los filtros. */
  perfiles: number
  /** Opciones de filtro calculadas sobre todo el catálogo visible. */
  rubros: string[]
  disponibilidades: string[]
}

export type ApplicantFilterParams = {
  q?: string
  rubro?: string
  disponibilidad?: string
  libreta?: '' | 'yes' | 'no'
  page?: number
  size?: number
}

export function emptyApplicantPage<T>(): ApplicantGroupPage<T> {
  return { pagina: emptyPage(), perfiles: 0, rubros: [], disponibilidades: [] }
}
