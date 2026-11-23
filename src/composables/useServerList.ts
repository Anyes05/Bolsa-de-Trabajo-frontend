import { onBeforeUnmount, ref, shallowRef, watch, type Ref, type WatchSource } from 'vue'

export const SEARCH_DEBOUNCE_MS = 300

/**
 * Listado resuelto en el servidor: la vista solo envía búsqueda, filtros y página.
 * - Cambiar un filtro vuelve a la página 0 (con debounce para la búsqueda de texto).
 * - Las respuestas viejas se descartan para que una búsqueda lenta no pise a una más nueva.
 */
export function useServerList<R>(options: {
  fetch: (page: number) => Promise<R>
  /** Filtros que no son texto libre: recargan al instante. */
  filters?: WatchSource[]
  /** Texto libre: recarga con debounce. */
  search?: Ref<string>
  onError: (error: unknown) => void
  initial: R
}) {
  const page = ref(0)
  const data = shallowRef<R>(options.initial)
  const loading = ref(false)
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  async function load(target = page.value) {
    const current = ++revision
    page.value = target
    loading.value = true
    try {
      const result = await options.fetch(target)
      if (current === revision) data.value = result
    } catch (error) {
      if (current === revision) options.onError(error)
    } finally {
      if (current === revision) loading.value = false
    }
  }

  function reset() {
    if (timer) clearTimeout(timer)
    timer = undefined
    return load(0)
  }

  if (options.filters?.length) watch(options.filters, () => { void reset() })
  if (options.search) {
    watch(options.search, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void reset() }, SEARCH_DEBOUNCE_MS)
    })
  }
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  return { page, data, loading, load, reset, goTo: (target: number) => load(target) }
}
