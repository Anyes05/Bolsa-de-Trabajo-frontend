import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthResponse, Role } from '../services/types'

const STORAGE_KEY = 'ccisj-session'

function readStoredSession(): AuthResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthResponse>
    if (!parsed.token || !parsed.email || !parsed.role) return null
    return { token: parsed.token, email: parsed.email, role: parsed.role }
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = readStoredSession()
  const token = ref<string | null>(stored?.token ?? null)
  const email = ref<string | null>(stored?.email ?? null)
  const role = ref<Role | null>(stored?.role ?? null)

  const isAuthenticated = computed(() => Boolean(token.value && email.value && role.value))
  const homeRoute = computed(() => {
    if (role.value === 'SOCIO') return 'socio-bolsa-empleo'
    if (role.value === 'POSTULANTE') return 'postulante-bolsa-empleo'
    return 'session'
  })

  function persist() {
    if (!token.value || !email.value || !role.value) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    const session: AuthResponse = {
      token: token.value,
      email: email.value,
      role: role.value,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }

  function setSession(session: AuthResponse) {
    token.value = session.token
    email.value = session.email
    role.value = session.role
    persist()
  }

  function logout() {
    token.value = null
    email.value = null
    role.value = null
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return { token, email, role, isAuthenticated, homeRoute, setSession, logout }
})
