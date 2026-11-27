import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { usePostulanteNotificationsStore } from './postulanteNotifications'
import { postulanteNotificationService } from '../services/postulanteNotificationService'
import type { SocioNotificationRecord } from '../services/socioNotificationService'

vi.mock('../services/postulanteNotificationService', () => ({
  postulanteNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn() },
}))

function registro(id: number, cambios: Partial<SocioNotificationRecord> = {}): SocioNotificationRecord {
  return { id, titulo: `Aviso ${id}`, cuerpo: `Cuerpo ${id}`, leida: false, popup: false, createdAt: null, comunicadoId: null, ...cambios }
}

function diferido<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function ingresar(token: string) {
  useAuthStore().setSession({ token, email: 'postulante@ejemplo.test', role: 'POSTULANTE' })
}

describe('store de notificaciones del postulante: cambio de sesión en curso', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('una carga de la sesión anterior que falla no pisa el estado de la nueva sesión', async () => {
    const store = usePostulanteNotificationsStore()
    const vieja = diferido<SocioNotificationRecord[]>()
    const nueva = diferido<SocioNotificationRecord[]>()
    vi.mocked(postulanteNotificationService.list).mockReturnValueOnce(vieja.promise).mockReturnValueOnce(nueva.promise)

    ingresar('token-a')
    const primera = store.load()
    ingresar('token-b')
    const segunda = store.load()
    vieja.reject(new Error('offline'))
    await primera

    expect(store.error).toBe('')
    expect(store.loading).toBe(true)
    nueva.resolve([registro(1)])
    await segunda
    expect(store.items).toEqual([registro(1)])
    expect(store.loading).toBe(false)
  })

  it('marcar como leída no aplica la respuesta ni el error si la sesión cambió', async () => {
    const store = usePostulanteNotificationsStore()
    ingresar('token-a')
    const ok = diferido<SocioNotificationRecord>()
    vi.mocked(postulanteNotificationService.markOneRead).mockReturnValueOnce(ok.promise)
    const leer = store.markOneRead(1)
    ingresar('token-b')
    ok.resolve(registro(1, { leida: true }))
    await leer
    expect(store.items).toEqual([])

    const falla = diferido<SocioNotificationRecord>()
    vi.mocked(postulanteNotificationService.markOneRead).mockReturnValueOnce(falla.promise)
    const leerOtra = store.markOneRead(2)
    ingresar('token-c')
    falla.reject(new Error('offline'))
    await leerOtra
    expect(store.error).toBe('')
  })

  it('marcar todas como leídas no aplica la respuesta ni el error si la sesión cambió', async () => {
    const store = usePostulanteNotificationsStore()
    ingresar('token-a')
    const ok = diferido<void>()
    vi.mocked(postulanteNotificationService.markAllRead).mockReturnValueOnce(ok.promise)
    const todas = store.markAllRead()
    ingresar('token-b')
    ok.resolve()
    await todas
    expect(store.items).toEqual([])

    const falla = diferido<void>()
    vi.mocked(postulanteNotificationService.markAllRead).mockReturnValueOnce(falla.promise)
    const otra = store.markAllRead()
    ingresar('token-c')
    falla.reject(new Error('offline'))
    await otra
    expect(store.error).toBe('')
  })
})
