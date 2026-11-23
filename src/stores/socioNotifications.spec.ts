import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { useSocioNotificationsStore } from './socioNotifications'
import { socioNotificationService, type SocioNotificationRecord } from '../services/socioNotificationService'

vi.mock('../services/socioNotificationService', () => ({
  socioNotificationService: { list: vi.fn(), markOneRead: vi.fn(), markAllRead: vi.fn(), dismissPopup: vi.fn() },
}))

function registro(id: number, cambios: Partial<SocioNotificationRecord> = {}): SocioNotificationRecord {
  return {
    id, titulo: `Aviso ${id}`, cuerpo: `Cuerpo ${id}`, leida: false, popup: false,
    createdAt: null, comunicadoId: null, ...cambios,
  }
}

function diferido<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function ingresar(role: 'SOCIO' | 'POSTULANTE' = 'SOCIO', token = 'token-socio') {
  useAuthStore().setSession({ token, email: 'socio@ejemplo.test', role })
}

describe('store de notificaciones del socio', () => {
  let body: { style: { overflow: string } }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    body = { style: { overflow: '' } }
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
    vi.stubGlobal('document', { body })
    vi.mocked(socioNotificationService.markOneRead).mockResolvedValue(registro(1, { leida: true }))
    vi.mocked(socioNotificationService.dismissPopup).mockResolvedValue(undefined)
    vi.mocked(socioNotificationService.markAllRead).mockResolvedValue(undefined)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('no carga sin sesión ni para otros roles', async () => {
    const store = useSocioNotificationsStore()
    await store.load()
    ingresar('POSTULANTE')
    await store.load()
    expect(socioNotificationService.list).not.toHaveBeenCalled()
  })

  it('mapea los registros, formatea la fecha y comparte la carga en curso', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    const pendiente = diferido<SocioNotificationRecord[]>()
    vi.mocked(socioNotificationService.list).mockReturnValueOnce(pendiente.promise)
    const primera = store.load()
    const segunda = store.load()
    expect(store.loading).toBe(true)
    pendiente.resolve([
      registro(1, { popup: true, createdAt: '2026-03-01T10:00:00Z' }),
      registro(2, { leida: true, popup: true }),
    ])
    await Promise.all([primera, segunda])

    expect(socioNotificationService.list).toHaveBeenCalledTimes(1)
    expect(store.loading).toBe(false)
    expect(store.items[0]).toMatchObject({ id: '1', kind: 'comunicado', title: 'Aviso 1', body: 'Cuerpo 1', unread: true, popup: true })
    expect(store.items[0]!.date).not.toBe('')
    expect(store.items[1]).toMatchObject({ id: '2', date: '', unread: false, popup: false })
    expect(store.unreadCount).toBe(1)
    expect(store.pendingPopup?.id).toBe('1')
    expect(store.toast?.id).toBe('1')

    // Una vez resuelta, una nueva carga vuelve a consultar al backend.
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([])
    await store.load()
    expect(socioNotificationService.list).toHaveBeenCalledTimes(2)
    expect(store.items).toEqual([])
  })

  it('informa el error de carga con mensaje propio o genérico', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockRejectedValueOnce(new Error('Servidor caído'))
    await store.load()
    expect(store.error).toBe('Servidor caído')
    expect(store.items).toEqual([])
    expect(store.loading).toBe(false)

    vi.mocked(socioNotificationService.list).mockRejectedValueOnce('fallo')
    await store.load()
    expect(store.error).toBe('No se pudieron cargar las notificaciones')
  })

  it('descarta respuestas y errores de una sesión anterior', async () => {
    ingresar('SOCIO', 'token-a')
    const store = useSocioNotificationsStore()
    const exito = diferido<SocioNotificationRecord[]>()
    vi.mocked(socioNotificationService.list).mockReturnValueOnce(exito.promise)
    const carga = store.load()
    ingresar('SOCIO', 'token-b')
    exito.resolve([registro(1)])
    await carga
    expect(store.items).toEqual([])
    expect(store.loading).toBe(false)

    const fallo = diferido<SocioNotificationRecord[]>()
    vi.mocked(socioNotificationService.list).mockReturnValueOnce(fallo.promise)
    const cargaFallida = store.load()
    ingresar('SOCIO', 'token-c')
    // Una carga nueva con otro token no reutiliza la promesa pendiente.
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(3)])
    const cargaNueva = store.load()
    fallo.reject(new Error('tarde'))
    await Promise.all([cargaFallida, cargaNueva])
    expect(store.error).toBe('')
    expect(store.items.map((item) => item.id)).toEqual(['3'])
  })

  it('reinicia el estado y libera el scroll al cambiar de sesión con un detalle abierto', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true })])
    await store.load()
    store.presentBlockingPopup()
    expect(body.style.overflow).toBe('hidden')
    ingresar('SOCIO', 'otro-token')
    expect(body.style.overflow).toBe('')
    expect(store.opened).toBeNull()
    expect(store.blocking).toBe(false)
    expect(store.items).toEqual([])

    // Sin detalle abierto el cambio de sesión no toca el scroll.
    body.style.overflow = 'auto'
    ingresar('SOCIO', 'tercer-token')
    expect(body.style.overflow).toBe('auto')
  })

  it('presenta el pop-up bloqueante solo si hay uno pendiente y nada abierto', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    store.presentBlockingPopup()
    expect(store.opened).toBeNull()

    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true }), registro(2, { popup: true })])
    await store.load()
    store.presentBlockingPopup()
    expect(store.blocking).toBe(true)
    expect(store.opened?.id).toBe('1')
    expect(store.toast).toBeNull()

    store.presentBlockingPopup()
    expect(store.opened?.id).toBe('1')

    // Mientras sea bloqueante no se cierra con closeDetail.
    store.closeDetail()
    expect(store.opened?.id).toBe('1')
  })

  it('cierra el pop-up bloqueante marcando lectura y descartando pop-ups', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true }), registro(2, { popup: true })])
    await store.load()
    store.presentBlockingPopup()
    await store.dismissBlockingPopup()

    expect(store.opened).toBeNull()
    expect(store.blocking).toBe(false)
    expect(body.style.overflow).toBe('')
    expect(store.items.every((item) => !item.popup)).toBe(true)
    expect(store.items.find((item) => item.id === '1')?.unread).toBe(false)
    expect(store.items.find((item) => item.id === '2')?.unread).toBe(true)
    expect(socioNotificationService.markOneRead).toHaveBeenCalledWith('1')
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)
    expect(store.toast).toBeNull()

    // Sin nada abierto ni bloqueante no hace nada.
    await store.dismissBlockingPopup()
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)
  })

  it('tolera fallos del backend al cerrar el pop-up y soporta bloqueo sin detalle', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true })])
    await store.load()
    store.presentBlockingPopup()
    vi.mocked(socioNotificationService.markOneRead).mockRejectedValueOnce(new Error('sin red'))
    await expect(store.dismissBlockingPopup()).resolves.toBeUndefined()
    expect(socioNotificationService.dismissPopup).not.toHaveBeenCalled()

    // Estado bloqueante sin comunicado abierto: solo se descarta el pop-up.
    store.blocking = true
    await store.dismissBlockingPopup()
    expect(socioNotificationService.markOneRead).toHaveBeenCalledTimes(1)
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)
  })

  it('abre y cierra el detalle marcando la lectura aunque falle el backend', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true }), registro(2)])
    await store.load()

    await store.openDetail(store.items[1]!)
    expect(store.opened).toMatchObject({ id: '2', unread: false, popup: false })
    expect(store.items[1]!.unread).toBe(false)
    expect(store.toast).toBeNull()
    expect(body.style.overflow).toBe('hidden')
    expect(socioNotificationService.markOneRead).toHaveBeenCalledWith('2')

    store.closeDetail()
    expect(store.opened).toBeNull()
    expect(body.style.overflow).toBe('')

    vi.mocked(socioNotificationService.markOneRead).mockRejectedValueOnce(new Error('sin red'))
    await expect(store.openDetail(store.items[0]!)).resolves.toBeUndefined()
    expect(store.items[0]!.unread).toBe(false)
  })

  it('marca una notificación como leída e informa errores', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1), registro(2), registro(3)])
    await store.load()

    await store.markOneRead('1')
    expect(store.items[0]!.unread).toBe(false)
    expect(store.unreadCount).toBe(2)

    vi.mocked(socioNotificationService.markOneRead).mockRejectedValueOnce(new Error('No autorizado'))
    await store.markOneRead('2')
    expect(store.error).toBe('No autorizado')
    expect(store.items[1]!.unread).toBe(true)

    vi.mocked(socioNotificationService.markOneRead).mockRejectedValueOnce(42)
    await store.markOneRead('2')
    expect(store.error).toBe('No se pudo marcar la notificación como leída')
  })

  it('ignora el resultado de marcar como leída si la sesión cambió', async () => {
    ingresar('SOCIO', 'token-a')
    const store = useSocioNotificationsStore()
    const exito = diferido<SocioNotificationRecord>()
    vi.mocked(socioNotificationService.markOneRead).mockReturnValueOnce(exito.promise)
    const marca = store.markOneRead('1')
    ingresar('SOCIO', 'token-b')
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1)])
    await store.load()
    exito.resolve(registro(1, { leida: true }))
    await marca
    expect(store.items[0]!.unread).toBe(true)

    const fallo = diferido<SocioNotificationRecord>()
    vi.mocked(socioNotificationService.markOneRead).mockReturnValueOnce(fallo.promise)
    const marcaFallida = store.markOneRead('1')
    ingresar('SOCIO', 'token-c')
    fallo.reject(new Error('tarde'))
    await marcaFallida
    expect(store.error).toBe('')
  })

  it('marca todas como leídas y recarga si el backend falla', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true }), registro(2)])
    await store.load()
    await store.markAllRead()
    expect(store.unreadCount).toBe(0)
    expect(store.pendingPopup).toBeNull()
    expect(socioNotificationService.markAllRead).toHaveBeenCalledTimes(1)

    vi.mocked(socioNotificationService.markAllRead).mockRejectedValueOnce(new Error('Error al marcar'))
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(5)])
    await store.markAllRead()
    // La recarga limpia el error y repone el estado real.
    expect(socioNotificationService.list).toHaveBeenCalledTimes(2)
    expect(store.error).toBe('')
    expect(store.unreadCount).toBe(1)

    vi.mocked(socioNotificationService.markAllRead).mockRejectedValueOnce('fallo')
    vi.mocked(socioNotificationService.list).mockRejectedValueOnce(new Error('Sigue caído'))
    await store.markAllRead()
    expect(store.error).toBe('Sigue caído')
  })

  it('usa el mensaje genérico al fallar marcar todas sin sesión de socio', async () => {
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.markAllRead).mockRejectedValueOnce('fallo')
    await store.markAllRead()
    expect(store.error).toBe('No se pudieron marcar como leídas')
    expect(socioNotificationService.list).not.toHaveBeenCalled()
  })

  it('descarta el aviso flotante aunque falle el backend', async () => {
    ingresar()
    const store = useSocioNotificationsStore()
    vi.mocked(socioNotificationService.list).mockResolvedValueOnce([registro(1, { popup: true })])
    await store.load()
    expect(store.toast?.id).toBe('1')
    await store.dismissToast()
    expect(store.toast).toBeNull()
    expect(store.pendingPopup).toBeNull()
    expect(store.items[0]!.unread).toBe(true)
    expect(socioNotificationService.dismissPopup).toHaveBeenCalledTimes(1)

    vi.mocked(socioNotificationService.dismissPopup).mockRejectedValueOnce(new Error('sin red'))
    await expect(store.dismissToast()).resolves.toBeUndefined()
  })
})
