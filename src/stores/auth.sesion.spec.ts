import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'

vi.mock('../services/authService', () => ({
  authService: { currentUser: vi.fn(), uploadProfilePhoto: vi.fn(), removeProfilePhoto: vi.fn(), logout: vi.fn() },
}))

describe('store de sesión: casos límite', () => {
  const storage = new Map<string, string>()
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('rechaza una sesión con rol inválido sin modificar el estado', () => {
    const auth = useAuthStore()
    expect(() => auth.setSession({ token: 't', email: 'e@x.test', role: 'OTRO' as never })).toThrow('Rol de sesión inválido')
    expect(auth.isAuthenticated).toBe(false)
    expect(storage.size).toBe(0)
  })

  it('sin sesión activa, persistir cambios elimina lo guardado en lugar de escribir', () => {
    storage.set('ccisj-session', 'basura')
    const auth = useAuthStore()
    auth.setFullName('Ana')
    expect(auth.fullName).toBe('Ana')
    expect(storage.has('ccisj-session')).toBe(false)
    storage.set('ccisj-session', 'basura')
    auth.setDebeCambiarPassword(true)
    expect(storage.has('ccisj-session')).toBe(false)
  })

  it('restaura una sesión sin nombre y sin flags opcionales', () => {
    storage.set('ccisj-session', JSON.stringify({ token: 't', email: 'e@x.test', role: 'ADMIN', fullName: '   ' }))
    const auth = useAuthStore()
    expect(auth.fullName).toBeNull()
    expect(auth.debeCambiarPassword).toBe(false)
    auth.setFullName(undefined)
    auth.setPhotoUrl(undefined)
    expect(auth.fullName).toBeNull()
    expect(auth.photoUrl).toBeNull()
    expect(JSON.parse(storage.get('ccisj-session')!)).toMatchObject({ esDirectivo: null, fullName: null })
  })

  it('acepta una sesión nueva sin nombre completo', () => {
    const auth = useAuthStore()
    auth.setSession({ token: 't2', email: 's@x.test', role: 'SOCIO' })
    expect(auth.fullName).toBeNull()
    expect(auth.isDirectivo).toBe(false)
    expect(JSON.parse(storage.get('ccisj-session')!)).toMatchObject({ role: 'SOCIO', esDirectivo: false, debeCambiarPassword: false })
  })
})
