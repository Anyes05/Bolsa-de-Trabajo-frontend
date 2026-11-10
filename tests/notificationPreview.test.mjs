import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NOTIFICATION_PREVIEW_LIMIT, recentNotifications } from '../src/utils/notificationPreview.ts'

function notice(id, createdAt) {
  return { id: String(id), title: `Aviso ${id}`, body: 'Contenido', createdAt, unread: true }
}

test('limits the dropdown to exactly the ten most recent notifications without changing the source', () => {
  const source = Array.from({ length: 15 }, (_, i) => notice(i + 1, `2026-11-${String(i + 1).padStart(2, '0')}T12:00:00Z`))
  const original = [...source]
  const result = recentNotifications(source)
  assert.equal(NOTIFICATION_PREVIEW_LIMIT, 10)
  assert.equal(result.length, 10)
  assert.deepEqual(result.map((item) => item.id), ['15', '14', '13', '12', '11', '10', '9', '8', '7', '6'])
  assert.deepEqual(source, original)
})

test('orders actual instants descending rather than localized dates or timezone strings', () => {
  const source = [
    notice(1, '2026-11-09T22:00:00-03:00'),
    notice(2, '2026-11-10T00:30:00Z'),
    notice(3, '2026-11-09T21:30:00-04:00'),
  ]
  assert.deepEqual(recentNotifications(source).map((item) => item.id), ['3', '1', '2'])
})

test('keeps undated or invalid dates at the end and preserves all short lists', () => {
  const source = [notice(1, null), notice(2, 'invalid'), notice(3, '2026-11-09T22:00:00Z')]
  assert.deepEqual(recentNotifications(source).map((item) => item.id), ['3', '1', '2'])
  assert.deepEqual(recentNotifications([]), [])
  assert.equal(recentNotifications([source[2]])[0], source[2])
})

test('includes read and unread notices by date, without mutating their read state or content', () => {
  const older = notice(1, '2026-11-08T22:00:00Z')
  const newer = { ...notice(2, '2026-11-09T22:00:00Z'), unread: false, body: 'Contenido completo\nOferta laboral' }
  const result = recentNotifications([older, newer])
  assert.deepEqual(result, [newer, older])
  assert.equal(result[0].body, newer.body)
  assert.equal(older.unread, true)
})
