import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthResponse, Role } from '../services/types'
import { authService } from '../services/authService'

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
    return {
      token: parsed.token,
      email: parsed.email,
      role,
      fullName: parsed.fullName?.trim() || null,
      esDirectivo: parsed.esDirectivo === true,
      debeCambiarPassword: parsed.debeCambiarPassword === true,
    }
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
  const photoUrl = ref<string | null>(null)
  let photoRevision = 0
  let pendingRefresh: { token: string; promise: Promise<void> } | null = null
  const esDirectivo = ref(stored?.esDirectivo === true)
  const debeCambiarPassword = ref(stored?.debeCambiarPassword === true)

  const isAuthenticated = computed(() => Boolean(token.value && email.value && role.value))
  const isDirectivo = computed(() => role.value === 'SOCIO' && esDirectivo.value)
  const homeRoute = computed(() => {
    if (role.value === 'SOCIO' && debeCambiarPassword.value) return 'socio-cambiar-clave'
    if (role.value === 'SOCIO') return 'socio-bolsa-empleo'
    if (role.value === 'POSTULANTE') return 'postulante-bolsa-empleo'
    if (role.value === 'ADMIN') return 'admin-dashboard'
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
      esDirectivo: role.value === 'SOCIO' ? esDirectivo.value : null,
      debeCambiarPassword: debeCambiarPassword.value,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }

  function setSession(session: AuthResponse) {
    const normalizedRole = normalizeRole(session.role)
    if (!normalizedRole) {
      throw new Error('Rol de sesión inválido')
    }
    if (email.value !== session.email || role.value !== normalizedRole) setPhotoUrl(null)
    token.value = session.token
    email.value = session.email
    role.value = normalizedRole
    fullName.value = session.fullName?.trim() || null
    esDirectivo.value = normalizedRole === 'SOCIO' && session.esDirectivo === true
    debeCambiarPassword.value = session.debeCambiarPassword === true
    persist()
  }

  function setFullName(value: string | null | undefined) {
    fullName.value = value?.trim() || null
    persist()
  }

  function setPhotoUrl(value: string | null | undefined) {
    photoUrl.value = value || null
    photoRevision++
  }

  async function refreshCurrentUser() {
    const sessionToken = token.value
    if (!sessionToken) return
    if (pendingRefresh?.token === sessionToken) return pendingRefresh.promise
    const revision = photoRevision
    const promise = authService.currentUser().then((user) => {
      if (token.value !== sessionToken) return
      setFullName(user.fullName)
      setEsDirectivo(user.esDirectivo)
      setDebeCambiarPassword(user.debeCambiarPassword === true)
      if (photoRevision === revision) setPhotoUrl(user.fotoUrl)
    })
    pendingRefresh = { token: sessionToken, promise }
    try {
      await promise
    } finally {
      if (pendingRefresh?.promise === promise) pendingRefresh = null
    }
  }

  async function uploadPhoto(file: File) {
    const sessionToken = token.value
    const result = await authService.uploadProfilePhoto(file)
    if (token.value === sessionToken) setPhotoUrl(result.fotoUrl)
  }

  async function removePhoto() {
    const sessionToken = token.value
    await authService.removeProfilePhoto()
    if (token.value === sessionToken) setPhotoUrl(null)
  }

  function setEsDirectivo(value: boolean | null | undefined) {
    if (role.value !== 'SOCIO') {
      esDirectivo.value = false
      persist()
      return
    }
    esDirectivo.value = value === true
    persist()
  }

  function setDebeCambiarPassword(value: boolean) {
    debeCambiarPassword.value = value
    persist()
  }

  async function logout() {
    try {
      if (token.value) {
        await authService.logout()
      }
    } catch {
      // Aunque el servidor no responda, se limpia la sesión local.
    }
    setPhotoUrl(null)
    token.value = null
    email.value = null
    role.value = null
    fullName.value = null
    esDirectivo.value = false
    debeCambiarPassword.value = false
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return {
    token,
    email,
    role,
    fullName,
    photoUrl,
    isAuthenticated,
    isDirectivo,
    debeCambiarPassword,
    homeRoute,
    setSession,
    setFullName,
    setPhotoUrl,
    refreshCurrentUser,
    uploadPhoto,
    removePhoto,
    setEsDirectivo,
    setDebeCambiarPassword,
    logout,
  }
})
