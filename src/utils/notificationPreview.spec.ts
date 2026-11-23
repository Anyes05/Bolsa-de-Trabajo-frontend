import { describe, expect, it } from 'vitest'
import { NOTIFICATION_PREVIEW_LIMIT, recentNotifications, type NotificationPreview } from './notificationPreview'

const aviso = (id: string, createdAt: string | null): NotificationPreview => ({ id, title: id, body: '', createdAt, unread: false })

describe('recentNotifications', () => {
  it('ordena de más reciente a más antigua y deja sin fecha o fecha inválida al final', () => {
    const items = [aviso('viejo', '2026-01-01T10:00:00Z'), aviso('sin-fecha', null), aviso('nuevo', '2026-03-01T10:00:00Z'), aviso('invalida', 'no-es-fecha')]
    expect(recentNotifications(items).map((item) => item.id)).toEqual(['nuevo', 'viejo', 'sin-fecha', 'invalida'])
  })

  it('conserva el orden entre fechas iguales y no modifica la lista original', () => {
    const items = [aviso('a', '2026-02-01T00:00:00Z'), aviso('b', '2026-02-01T00:00:00Z')]
    expect(recentNotifications(items).map((item) => item.id)).toEqual(['a', 'b'])
    expect(items.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('limita el resultado a la cantidad máxima de avisos', () => {
    const items = Array.from({ length: 15 }, (_, i) => aviso(String(i), `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`))
    const result = recentNotifications(items)
    expect(result).toHaveLength(NOTIFICATION_PREVIEW_LIMIT)
    expect(result[0].id).toBe('14')
  })
})
