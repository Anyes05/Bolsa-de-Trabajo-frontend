import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { authService } from '../services/authService'
import type { AuthResponse, CurrentUserResponse, Role } from '../services/types'

vi.mock('../services/authService', () => ({
  authService: {
    currentUser: vi.fn(), uploadProfilePhoto: vi.fn(),
    removeProfilePhoto: vi.fn(), logout: vi.fn(),
  },
}))

const session = (role: Role = 'SOCIO'): AuthResponse => ({
  token: 'test-token', email: 'test@example.test', role, fullName: ' Ana ',
  esDirectivo: true, debeCambiarPassword: false,
})
const currentUser: CurrentUserResponse = {
  email: 'test@example.test', fullName: 'Nombre actualizado',
  fotoUrl: '/photo.jpg', roles: ['SOCIO'], esDirectivo: true,
  debeCambiarPassword: true,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('authenticated session store', () => {
  const storage = new Map<string, string>()
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['ADMIN', 'admin-dashboard'], ['SOCIO', 'socio-bolsa-empleo'],
    ['POSTULANTE', 'postulante-bolsa-empleo'],
  ] as const)('restores %s session, normalizes fields and selects its home', (role, home) => {
    storage.set('ccisj-session', JSON.stringify({ ...session(role), role: ` ${role.toLowerCase()} ` }))
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.homeRoute).toBe(home)
    expect(auth.fullName).toBe('Ana')
    expect(auth.isDirectivo).toBe(role === 'SOCIO')
  })

  it.each(['{invalid', '{}', '{"token":"t","email":"e","role":"OTHER"}',
    '{"token":"t","email":"e","role":null}'])('does not authenticate corrupt storage %s', (raw) => {
    storage.set('ccisj-session', raw)
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.homeRoute).toBe('session')
  })

  it('persists account updates and forces provisional-password navigation', () => {
    const auth = useAuthStore()
    auth.setSession(session())
    auth.setDebeCambiarPassword(true)
    auth.setFullName(' Nuevo nombre ')
    expect(auth.homeRoute).toBe('socio-cambiar-clave')
    expect(JSON.parse(storage.get('ccisj-session')!)).toMatchObject({
      fullName: 'Nuevo nombre', debeCambiarPassword: true,
    })
    auth.setPhotoUrl('/old.jpg')
    auth.setSession(session('POSTULANTE'))
    auth.setEsDirectivo(true)
    expect(auth.photoUrl).toBeNull()
    expect(auth.isDirectivo).toBe(false)
  })

  it('deduplicates refresh and preserves a photo changed while refresh is pending', async () => {
    const auth = useAuthStore()
    auth.setSession(session())
    const pending = deferred<CurrentUserResponse>()
    vi.mocked(authService.currentUser).mockReturnValueOnce(pending.promise)
    const first = auth.refreshCurrentUser()
    const second = auth.refreshCurrentUser()
    auth.setPhotoUrl('/new-upload.jpg')
    pending.resolve(currentUser)
    await Promise.all([first, second])
    expect(authService.currentUser).toHaveBeenCalledTimes(1)
    expect(auth.fullName).toBe('Nombre actualizado')
    expect(auth.photoUrl).toBe('/new-upload.jpg')
    expect(auth.homeRoute).toBe('socio-cambiar-clave')
  })

  it('ignores a stale user response after switching sessions', async () => {
    const auth = useAuthStore()
    auth.setSession(session())
    const pending = deferred<CurrentUserResponse>()
    vi.mocked(authService.currentUser).mockReturnValueOnce(pending.promise)
    const refresh = auth.refreshCurrentUser()
    auth.setSession({ ...session('ADMIN'), token: 'another-token', fullName: 'Admin' })
    pending.resolve(currentUser)
    await refresh
    expect(auth.fullName).toBe('Admin')
    expect(auth.photoUrl).toBeNull()
  })

  it('propagates refresh failures and permits a subsequent refresh', async () => {
    const auth = useAuthStore()
    await auth.refreshCurrentUser()
    expect(authService.currentUser).not.toHaveBeenCalled()
    auth.setSession(session())
    vi.mocked(authService.currentUser).mockRejectedValueOnce(new Error('offline'))
    await expect(auth.refreshCurrentUser()).rejects.toThrow('offline')
    vi.mocked(authService.currentUser).mockResolvedValueOnce(currentUser)
    await auth.refreshCurrentUser()
    expect(auth.photoUrl).toBe('/photo.jpg')
  })

  it('uploads/removes photos and ignores uploads completed after logout', async () => {
    const auth = useAuthStore()
    auth.setSession(session())
    const file = new File(['photo'], 'photo.png', { type: 'image/png' })
    vi.mocked(authService.uploadProfilePhoto).mockResolvedValueOnce({ fotoUrl: '/uploaded.jpg' })
    await auth.uploadPhoto(file)
    expect(auth.photoUrl).toBe('/uploaded.jpg')
    await auth.removePhoto()
    expect(auth.photoUrl).toBeNull()
    const pending = deferred<{ fotoUrl: string }>()
    vi.mocked(authService.uploadProfilePhoto).mockReturnValueOnce(pending.promise)
    const upload = auth.uploadPhoto(file)
    await auth.logout()
    pending.resolve({ fotoUrl: '/stale.jpg' })
    await upload
    expect(auth.photoUrl).toBeNull()
  })

  it('clears the local session even if the server logout fails', async () => {
    const auth = useAuthStore()
    auth.setSession(session())
    vi.mocked(authService.logout).mockRejectedValueOnce(new Error('offline'))
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.fullName).toBeNull()
    expect(auth.homeRoute).toBe('session')
    expect(storage.has('ccisj-session')).toBe(false)
    await auth.logout()
    expect(authService.logout).toHaveBeenCalledTimes(1)
  })
})
