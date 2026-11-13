import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import ts from 'typescript'
import ExcelJS from 'exceljs'
import * as rangeHelpers from '../src/utils/cajaExportRange.ts'

test('downloaded workbook contains only inclusive-range movements and keeps current balances explicit', async () => {
  const source = await readFile(new URL('../src/services/cajaExcelService.ts', import.meta.url), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const require = createRequire(import.meta.url)
  let requests = 0
  const history = {
    razonSocial: 'Socio prueba', bps: '123', cedula: null, nombreRubro: 'Comercio',
    estadoMorosidad: 'MOROSO', saldo: 900, deudaVencida: 500,
    movimientos: [
      { fecha: '2026-10-31', tipo: 'CUOTA', monto: 100, pendiente: 100, saldoResultante: 100 },
      { fecha: '2026-11-01', tipo: 'CUOTA', monto: 200, pendiente: 100, saldoResultante: 300 },
      { fecha: '2026-11-30', tipo: 'PAGO', monto: 100, pendiente: 0, saldoResultante: 200 },
      { fecha: '2026-12-01', tipo: 'CUOTA', monto: 700, pendiente: 700, saldoResultante: 900 },
    ],
  }
  const exports = {}
  const mockedRequire = (name) => {
    if (name === './cajaService') return { cajaService: { getHistorial: async () => { requests++; return history } } }
    if (name === './socioService') return { estadoMorosidadLabel: { MOROSO: 'Moroso' } }
    if (name === '../utils/cajaExportRange') return rangeHelpers
    return require(name)
  }
  new Function('require', 'exports', output)(mockedRequire, exports)
  let blob
  let filename
  const link = { click() { filename = this.download }, remove() {} }
  const previousDocument = globalThis.document
  const previousWindow = globalThis.window
  const previousCreate = URL.createObjectURL
  try {
    globalThis.document = { createElement: () => link, body: { appendChild() {} } }
    globalThis.window = { setTimeout() {} }
    URL.createObjectURL = (value) => { blob = value; return 'blob:test-only' }
    const accounts = [{ socioId: 1, telefono: '091111111' }]
    await exports.cajaExcelService.download(accounts, { desde: '2026-11-01', hasta: '2026-11-30' })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())
    const detail = workbook.getWorksheet('Por mes')
    const dates = []
    detail.eachRow(row => {
      if (row.getCell(1).value instanceof Date) dates.push(row.getCell(1).value.toISOString().slice(0, 10))
    })
    assert.deepEqual(dates, ['2026-11-01', '2026-11-30'])
    assert.equal(workbook.getWorksheet('Resumen').getRow(2).getCell(6).value, -900)
    assert.equal(workbook.getWorksheet('Resumen').getRow(2).getCell(7).value, 900)
    assert.match(detail.getRow(1).getCell(1).value, /no son un cierre histórico/)
    assert.equal(filename, 'control-caja-2026-11-01-a-2026-11-30.xlsx')
    await exports.cajaExcelService.download(accounts)
    const unfiltered = new ExcelJS.Workbook()
    await unfiltered.xlsx.load(await blob.arrayBuffer())
    let rows = 0
    unfiltered.getWorksheet('Por mes').eachRow(row => { if (row.getCell(1).value instanceof Date) rows++ })
    assert.equal(rows, 4)
    for (const column of [6, 9]) {
      const header = unfiltered.getWorksheet('Resumen').getRow(1).getCell(column)
      assert.equal(header.font.color.argb, 'FFFFFFFF')
      assert.doesNotMatch(header.numFmt, /\[Green\]/)
    }
    const monthlySheet = unfiltered.getWorksheet('Por mes')
    for (const rowNumber of [1, 2]) {
      const cell = monthlySheet.getRow(rowNumber).getCell(1)
      assert.equal(cell.font.color.argb, 'FF000000')
      assert.doesNotMatch(cell.numFmt ?? '', /\[Green\]/)
    }
    const saldoHeader = monthlySheet.getRow(3).getCell(5)
    assert.equal(saldoHeader.font.color.argb, 'FFFFFFFF')
    assert.doesNotMatch(saldoHeader.numFmt, /\[Green\]/)
    await assert.rejects(exports.cajaExcelService.download(accounts, { desde: '2026-12-01', hasta: '2026-11-01' }))
    assert.equal(requests, 2, 'invalid range must not fetch or download')
    for (const balance of [-125.50, 80, 0]) {
      history.saldo = balance
      history.movimientos = [
        { fecha: '2026-11-01', tipo: 'CUOTA', monto: 100, pendiente: 0, saldoResultante: balance },
      ]
      await exports.cajaExcelService.download(accounts)
      const signed = new ExcelJS.Workbook()
      await signed.xlsx.load(await blob.arrayBuffer())
      const summary = signed.getWorksheet('Resumen').getRow(2)
      const monthly = signed.getWorksheet('Por mes').getRow(4)
      const expected = balance === 0 ? 0 : -balance
      assert.equal(summary.getCell(6).value, expected)
      assert.equal(monthly.getCell(5).value, expected)
      assert.equal(summary.getCell(7).value, Math.max(balance, 0))
      assert.equal(summary.getCell(9).value, Math.max(-balance, 0))
      for (const cell of [summary.getCell(6), summary.getCell(9), monthly.getCell(5)]) {
        const [positive, negative, zero] = cell.numFmt.split(';')
        assert.equal(positive, '[Green]+"$" #,##0.00')
        assert.equal(negative, '[Red]-"$" #,##0.00')
        assert.equal(zero, '"$" #,##0.00')
      }
    }
  } finally {
    globalThis.document = previousDocument
    globalThis.window = previousWindow
    URL.createObjectURL = previousCreate
  }
})
