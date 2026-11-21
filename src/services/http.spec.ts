import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, request } from './http'

describe('HTTP client', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends JSON requests with the current bearer token and custom headers', async () => {
    storage.set('ccisj-session', JSON.stringify({ token: 'abc123' }))
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(request<{ ok: boolean }>('/profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana' }),
      headers: { 'X-Trace': 'test' },
    })).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledWith('/api/profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer abc123',
        'X-Trace': 'test',
      },
    })
  })

  it('does not force JSON content type for file uploads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const body = new FormData()
    body.append('file', new Blob(['cv']), 'cv.txt')

    await expect(request<void>('/cv', { method: 'POST', body })).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith('/api/cv', {
      method: 'POST',
      body,
      headers: {},
    })
  })

  it('ignores malformed sessions instead of blocking public requests', async () => {
    storage.set('ccisj-session', '{invalid')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ public: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await request('/public')

    expect(fetchMock).toHaveBeenCalledWith('/api/public', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it.each([
    [{ detail: 'Detalle específico' }, 'Detalle específico'],
    [{ message: 'Mensaje específico' }, 'Mensaje específico'],
    [{ error: 'Error específico' }, 'Error específico'],
    [{ title: 'Título específico' }, 'Título específico'],
    [{ ignored: true }, 'No fue posible completar la solicitud. Intentá nuevamente en unos momentos.'],
    [null, 'No fue posible completar la solicitud. Intentá nuevamente en unos momentos.'],
  ])('reports structured API errors without replacing their detail', async (payload, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(payload === null ? '' : JSON.stringify(payload), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    ))

    const error = await request('/validation').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({
      message: expected,
      status: 422,
      path: '/validation',
      payload,
    })
  })

  it('handles non-JSON authentication failures and logs diagnostic context', async () => {
    storage.set('ccisj-session', JSON.stringify({ token: 'expired' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('not-json', { status: 401, headers: { 'Content-Type': 'text/plain' } }),
    ))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(request('/private')).rejects.toMatchObject({
      status: 401,
      payload: null,
    })
    expect(consoleError).toHaveBeenCalledWith('[http-request-auth-error]', {
      path: '/private',
      status: 401,
      hasSessionToken: true,
    })
  })
})
