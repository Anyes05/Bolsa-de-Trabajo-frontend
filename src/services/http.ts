const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || 'No fue posible completar la solicitud.')
  }

  return response.json() as Promise<T>
}
