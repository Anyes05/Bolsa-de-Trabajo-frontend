import { request } from './http'
import type { AuthResponse, ChangePasswordPayload, CurrentUserResponse, RegisterApplicantPayload, Role } from './types'

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

  changePassword(payload: ChangePasswordPayload) {
    return request<AuthResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  registerApplicant(payload: RegisterApplicantPayload) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
