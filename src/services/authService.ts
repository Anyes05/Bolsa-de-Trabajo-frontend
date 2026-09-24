import { request } from './http'
import type { AuthResponse, CurrentUserResponse, RegisterApplicantPayload, Role } from './types'

export const authService = {
  currentUser() {
    return request<CurrentUserResponse>('/auth/me')
  },

  login(role: Role, identifier: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, identifier, password }),
    })
  },

  registerApplicant(payload: RegisterApplicantPayload) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
