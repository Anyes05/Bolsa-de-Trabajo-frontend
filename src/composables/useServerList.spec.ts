// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { SEARCH_DEBOUNCE_MS, useServerList } from './useServerList'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function montar(fetch: (page: number) => Promise<string>, onError = vi.fn()) {
  const search = ref('')
  const filtro = ref('A')
  let api!: ReturnType<typeof useServerList<string>>
  const wrapper = mount(defineComponent({
    setup() {
      api = useServerList<string>({ fetch, filters: [filtro], search, onError, initial: 'inicial' })
      return () => h('div')
    },
  }))
  return { wrapper, api, search, filtro, onError }
}

describe('useServerList', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('carga la página pedida y expone datos y estado de carga', async () => {
    const respuesta = deferred<string>()
    const fetch = vi.fn().mockReturnValueOnce(respuesta.promise)
    const { api } = montar(fetch)
    expect(api.data.value).toBe('inicial')
    const carga = api.load(2)
    expect(api.loading.value).toBe(true)
    expect(api.page.value).toBe(2)
    respuesta.resolve('pagina 2')
    await carga
    expect(fetch).toHaveBeenCalledWith(2)
    expect(api.data.value).toBe('pagina 2')
    expect(api.loading.value).toBe(false)
  })

  it('un filtro vuelve a la página 0 al instante', async () => {
    const fetch = vi.fn().mockResolvedValue('ok')
    const { api, filtro } = montar(fetch)
    await api.goTo(3)
    filtro.value = 'B'
    await nextTick()
    await flushPromises()
    expect(fetch).toHaveBeenLastCalledWith(0)
    expect(api.page.value).toBe(0)
  })

  it('la búsqueda espera el debounce y agrupa varias teclas en una petición', async () => {
    const fetch = vi.fn().mockResolvedValue('ok')
    const { search } = montar(fetch)
    search.value = 'a'
    await nextTick()
    search.value = 'ab'
    await nextTick()
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    expect(fetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(0)
  })

  it('un filtro cancela una búsqueda pendiente', async () => {
    const fetch = vi.fn().mockResolvedValue('ok')
    const { search, filtro } = montar(fetch)
    search.value = 'a'
    await nextTick()
    filtro.value = 'B'
    await nextTick()
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2)
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('descarta respuestas y errores de peticiones superadas', async () => {
    const vieja = deferred<string>()
    const nueva = deferred<string>()
    const fetch = vi.fn().mockReturnValueOnce(vieja.promise).mockReturnValueOnce(nueva.promise)
    const { api, onError } = montar(fetch)
    const primera = api.load(0)
    const segunda = api.load(1)
    nueva.resolve('nueva')
    await segunda
    vieja.reject(new Error('tarde'))
    await primera
    expect(api.data.value).toBe('nueva')
    expect(onError).not.toHaveBeenCalled()
    expect(api.loading.value).toBe(false)
  })

  it('informa el error de la petición vigente', async () => {
    const error = new Error('caído')
    const { api, onError } = montar(vi.fn().mockRejectedValueOnce(error))
    await api.load()
    expect(onError).toHaveBeenCalledWith(error)
    expect(api.loading.value).toBe(false)
  })

  it('no dispara la búsqueda pendiente después de desmontar', async () => {
    const fetch = vi.fn().mockResolvedValue('ok')
    const { wrapper, search } = montar(fetch)
    search.value = 'a'
    await nextTick()
    wrapper.unmount()
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2)
    expect(fetch).not.toHaveBeenCalled()
  })
})
