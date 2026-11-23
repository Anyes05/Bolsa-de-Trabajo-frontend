import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { postulanteNotificationService } from './postulanteNotificationService'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('postulanteNotificationService', () => {
  beforeEach(() => { vi.mocked(request).mockReset().mockResolvedValue(undefined) })

  it('lista las notificaciones del postulante', async () => {
    await postulanteNotificationService.list()
    expect(request).toHaveBeenCalledWith('/postulante/notificaciones')
  })

  it('marca una notificación como leída', async () => {
    await postulanteNotificationService.markOneRead(7)
    expect(request).toHaveBeenCalledWith('/postulante/notificaciones/7/leer', { method: 'POST' })
  })

  it('marca todas como leídas', async () => {
    await postulanteNotificationService.markAllRead()
    expect(request).toHaveBeenCalledWith('/postulante/notificaciones/marcar-leidas', { method: 'POST' })
  })
})
