export type Role = 'ADMIN' | 'SOCIO' | 'POSTULANTE'
export type AuthResponse = { token: string; email: string; role: Role }

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || 'No fue posible completar la solicitud.')
  return response.json() as Promise<T>
}

export const api = {
  login: (role: Role, identifier: string, password: string) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ role, identifier, password }) }),
  registerApplicant: (payload: Record<string, unknown>) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getSectors: () => request<string[]>('/sectors'),
}