import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isDirectivoEmail } from '../data/mockSocioDirectorio'
import type { AuthResponse, Role } from '../services/types'

const STORAGE_KEY = 'ccisj-session'

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'SOCIO') return 'SOCIO'
  if (normalized === 'POSTULANTE') return 'POSTULANTE'
  return null
}

function readStoredSession(): AuthResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthResponse>
    const role = normalizeRole(parsed.role)
    if (!parsed.token || !parsed.email || !role) return null
    return { token: parsed.token, email: parsed.email, role, fullName: parsed.fullName?.trim() || null }
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = readStoredSession()
  const token = ref<string | null>(stored?.token ?? null)
  const email = ref<string | null>(stored?.email ?? null)
  const role = ref<Role | null>(stored?.role ?? null)
  const fullName = ref<string | null>(stored?.fullName?.trim() || null)

  const isAuthenticated = computed(() => Boolean(token.value && email.value && role.value))
  const isDirectivo = computed(() => role.value === 'SOCIO' && isDirectivoEmail(email.value))
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
      fullName: fullName.value,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }

  function setSession(session: AuthResponse) {
    const normalizedRole = normalizeRole(session.role)
    if (!normalizedRole) {
      throw new Error('Rol de sesion invalido')
    }
    token.value = session.token
    email.value = session.email
    role.value = normalizedRole
    fullName.value = session.fullName?.trim() || null
    persist()
  }

  function setFullName(value: string | null | undefined) {
    fullName.value = value?.trim() || null
    persist()
  }

  function logout() {
    token.value = null
    email.value = null
    role.value = null
    fullName.value = null
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return { token, email, role, fullName, isAuthenticated, isDirectivo, homeRoute, setSession, setFullName, logout }
})
