const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiRequestError extends Error {
  status: number
  path: string
  payload: unknown

  constructor(status: number, path: string, payload: unknown, detail: string) {
    super(`${status}: ${detail}`)
    this.name = 'ApiRequestError'
    this.status = status
    this.path = path
    this.payload = payload
  }
}

function readErrorDetail(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return 'No fue posible completar la solicitud.'
  }
  const body = payload as { detail?: unknown; message?: unknown; error?: unknown }
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail
  if (typeof body.message === 'string' && body.message.trim()) return body.message
  if (typeof body.error === 'string' && body.error.trim()) return body.error
  return 'No fue posible completar la solicitud.'
}

function readSessionToken(): string | null {
  try {
    const raw = sessionStorage.getItem('ccisj-session')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string }
    return parsed.token ?? null
  } catch {
    return null
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Token de sesion vigente al momento del request (puede ser sobreescrito por options.headers).
  const token = readSessionToken()
  const isFormData = options.body instanceof FormData
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const detail = readErrorDetail(payload)
    if (response.status === 401 || response.status === 403) {
      console.error('[http-request-auth-error]', { path, status: response.status, hasSessionToken: Boolean(token) })
    }
    throw new ApiRequestError(response.status, path, payload, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
