import { flushPromises } from '@vue/test-utils'
import { SEARCH_DEBOUNCE_MS } from '../composables/useServerList'
import type { ApplicantGroupPage, Page } from '../services/pagination'

/** Respuesta paginada del backend para los tests (una sola página por defecto). */
export function pageOf<T>(items: T[], page = 0, size = 20, totalElements = items.length): Page<T> {
  return { content: items, page, size, totalElements, totalPages: Math.ceil(totalElements / size) }
}

/** Agrupa perfiles por postulante como lo hace el backend. */
export function applicantPageOf<T extends { applicantId: number; sectors: string[]; availability: string }>(
  profiles: T[], all: T[] = profiles,
): ApplicantGroupPage<T> {
  const groups = new Map<number, T[]>()
  profiles.forEach((profile) => groups.set(profile.applicantId, [...(groups.get(profile.applicantId) ?? []), profile]))
  const content = [...groups.entries()].map(([applicantId, items]) => ({ applicantId, profiles: items }))
  return {
    pagina: pageOf(content),
    perfiles: profiles.length,
    rubros: [...new Set(all.flatMap((p) => p.sectors))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    disponibilidades: [...new Set(all.map((p) => p.availability))].filter(Boolean).sort(),
  }
}

/** Espera el debounce de la búsqueda de texto y resuelve las promesas pendientes. */
export async function waitForSearch() {
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 20))
  await flushPromises()
}
