import assert from 'node:assert/strict'
import test from 'node:test'
import { cajaExportRangeError, filterCajaExportMovements } from '../src/utils/cajaExportRange.ts'

const items = [
  { fecha: '2026-10-31', monto: 5 },
  { fecha: '2026-11-01T00:00:00-03:00', monto: 10 },
  { fecha: '2026-11-10', monto: 20 },
  { fecha: '2026-11-30T23:59:59-03:00', monto: 30 },
  { fecha: '2026-12-01', monto: 40 },
]

test('exports only movements in the inclusive date range, preserving amounts and order', () => {
  assert.deepEqual(filterCajaExportMovements(items, { desde: '2026-11-01', hasta: '2026-11-30' }), items.slice(1, 4))
  assert.equal(items.length, 5)
})
test('supports unbounded ranges, one-sided limits and days without movements', () => {
  assert.deepEqual(filterCajaExportMovements(items, {}), items)
  assert.deepEqual(filterCajaExportMovements(items, { desde: '2026-11-30' }), items.slice(3))
  assert.deepEqual(filterCajaExportMovements(items, { hasta: '2026-11-01' }), items.slice(0, 2))
  assert.deepEqual(filterCajaExportMovements(items, { desde: '2026-11-10', hasta: '2026-11-10' }), [items[2]])
  assert.deepEqual(filterCajaExportMovements(items, { desde: '2027-01-01' }), [])
})
test('rejects reversed ranges and invalid calendar dates instead of exporting all data', () => {
  for (const range of [
    { desde: '2026-12-01', hasta: '2026-11-01' },
    { desde: '2026-02-30' }, { hasta: 'invalid' }, { desde: '2026-13-01' },
  ]) {
    assert.ok(cajaExportRangeError(range))
    assert.throws(() => filterCajaExportMovements(items, range))
  }
  assert.equal(cajaExportRangeError({ desde: '2028-02-29' }), '')
})
