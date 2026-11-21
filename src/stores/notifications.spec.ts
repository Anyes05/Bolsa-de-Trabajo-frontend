import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { useSocioNotificationsStore } from './socioNotifications'
import { usePostulanteNotificationsStore } from './postulanteNotifications'
import { socioNotificationService } from '../services/socioNotificationService'
import { postulanteNotificationService } from '../services/postulanteNotificationService'
import type { SocioNotificationRecord } from '../services/socioNotificationService'

vi.mock('../services/socioNotificationService', () => ({
  socioNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn(), dismissPopup: vi.fn() },
}))
vi.mock('../services/postulanteNotificationService', () => ({
  postulanteNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn() },
}))

const record = (id: number): SocioNotificationRecord => ({
  id, titulo: 'Aviso', cuerpo: 'Contenido', leida: false, popup: true,
  createdAt: null, comunicadoId: null,
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('notification stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
    vi.stubGlobal('document', { body: { style: { overflow: '' } } })
  })
  afterEach(() => vi.unstubAllGlobals())

  function login(role: 'SOCIO' | 'POSTULANTE') {
    useAuthStore().setSession({ token: 'test-token', email: 'test@example.test', role })
  }

  it('loads only the matching role and deduplicates applicant requests', async () => {
    const store = usePostulanteNotificationsStore()
    await store.load()
    login('SOCIO')
    await store.load()
    expect(postulanteNotificationService.list).not.toHaveBeenCalled()
    login('POSTULANTE')
    const pending = deferred<SocioNotificationRecord[]>()
    vi.mocked(postulanteNotificationService.list).mockReturnValueOnce(pending.promise)
    const a = store.load()
    const b = store.load()
    expect(store.loading).toBe(true)
    pending.resolve([record(1)])
    await Promise.all([a, b])
    expect(postulanteNotificationService.list).toHaveBeenCalledTimes(1)
    expect(store.unreadCount).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('discards stale applicant loads after logout', async () => {
    login('POSTULANTE')
    const store = usePostulanteNotificationsStore()
    const pending = deferred<SocioNotificationRecord[]>()
    vi.mocked(postulanteNotificationService.list).mockReturnValueOnce(pending.promise)
    const load = store.load()
    await useAuthStore().logout()
    pending.resolve([record(1)])
    await load
    expect(store.items).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('marks applicant notifications and leaves arrivals during mark-all unread', async () => {
    login('POSTULANTE')
    const store = usePostulanteNotificationsStore()
    store.items = [record(1), record(2)]
    vi.mocked(postulanteNotificationService.markOneRead)
      .mockResolvedValueOnce({ ...record(1), leida: true, popup: false })
    await store.markOneRead(1)
    expect(store.unreadCount).toBe(1)
    const pending = deferred<void>()
    vi.mocked(postulanteNotificationService.markAllRead).mockReturnValueOnce(pending.promise)
    const marking = store.markAllRead()
    store.items.push(record(3))
    pending.resolve()
    await marking
    expect(store.items.filter((item) => !item.leida).map((item) => item.id)).toEqual([3])
  })

  it('exposes applicant failures without losing unread state', async () => {
    login('POSTULANTE')
    const store = usePostulanteNotificationsStore()
    vi.mocked(postulanteNotificationService.list).mockRejectedValueOnce(new Error('offline'))
    await store.load()
    expect(store.error).not.toBe('')
    expect(store.loading).toBe(false)
    store.items = [record(1)]
    vi.mocked(postulanteNotificationService.markOneRead).mockRejectedValueOnce(new Error('offline'))
    await store.markOneRead(1)
    expect(store.error).not.toBe('')
    expect(store.unreadCount).toBe(1)
    vi.mocked(postulanteNotificationService.markAllRead).mockRejectedValueOnce(new Error('offline'))
    await store.markAllRead()
    expect(store.error).not.toBe('')
    expect(store.unreadCount).toBe(1)
  })

  it('shows a blocking socio popup, disallows plain close and dismisses via API', async () => {
    login('SOCIO')
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([record(1), { ...record(2), leida: true }])
    await store.load()
    expect(store.unreadCount).toBe(1)
    expect(store.toast?.id).toBe('1')
    store.presentBlockingPopup()
    expect(store.blocking).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(store.toast).toBeNull()
    store.closeDetail()
    expect(store.opened).not.toBeNull()
    await store.dismissBlockingPopup()
    expect(store.opened).toBeNull()
    expect(store.pendingPopup).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(socioNotificationService.markOneRead).toHaveBeenCalledWith('1')
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)
  })

  it('opens details and clears the modal and page lock on logout', async () => {
    login('SOCIO')
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([{
      ...record(1), createdAt: '2026-11-20T12:00:00Z',
    }])
    await store.load()
    await store.openDetail(store.items[0]!)
    expect(store.unreadCount).toBe(0)
    expect(store.opened?.body).toBe('Contenido')
    store.closeDetail()
    expect(document.body.style.overflow).toBe('')
    await store.openDetail(store.items[0]!)
    await useAuthStore().logout()
    expect(store.items).toEqual([])
    expect(store.opened).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('recovers socio read failures from the server and dismisses toast locally', async () => {
    login('SOCIO')
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValue([record(1)])
    await store.load()
    vi.mocked(socioNotificationService.markOneRead).mockRejectedValueOnce(new Error('read failed'))
    await store.markOneRead('1')
    expect(store.error).toBe('read failed')
    expect(store.unreadCount).toBe(1)
    vi.mocked(socioNotificationService.markAllRead).mockRejectedValueOnce(new Error('all failed'))
    await store.markAllRead()
    expect(store.unreadCount).toBe(1)
    await store.markOneRead('1')
    expect(store.unreadCount).toBe(0)
    await store.load()
    vi.mocked(socioNotificationService.dismissPopup).mockRejectedValueOnce(new Error('offline'))
    await store.dismissToast()
    expect(store.toast).toBeNull()
    expect(store.pendingPopup).toBeNull()
  })

  it('deduplicates socio loads and ignores responses from an old session', async () => {
    const store = useSocioNotificationsStore()
    await store.load()
    login('POSTULANTE')
    await store.load()
    expect(socioNotificationService.list).not.toHaveBeenCalled()
    login('SOCIO')
    const pending = deferred<SocioNotificationRecord[]>()
    vi.mocked(socioNotificationService.list).mockReturnValueOnce(pending.promise)
    const a = store.load()
    const b = store.load()
    await useAuthStore().logout()
    pending.resolve([record(1)])
    await Promise.all([a, b])
    expect(socioNotificationService.list).toHaveBeenCalledTimes(1)
    expect(store.items).toEqual([])
    login('SOCIO')
    vi.mocked(socioNotificationService.list).mockRejectedValueOnce(new Error('offline'))
    await store.load()
    expect(store.error).toBe('offline')
    expect(store.loading).toBe(false)
  })
})
