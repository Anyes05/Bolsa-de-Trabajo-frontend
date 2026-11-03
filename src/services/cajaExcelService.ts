import { cajaService } from './cajaService'
import { estadoMorosidadLabel } from './socioService'
import type { CuentaCaja } from './types'

type TotalesMes = {
  cuotas: number
  reintegros: number
  pendiente: number
  cobros: number
  cargos: number
}

function totalesVacios(): TotalesMes {
  return { cuotas: 0, reintegros: 0, pendiente: 0, cobros: 0, cargos: 0 }
}

function estadoDelMes(totales: TotalesMes) {
  if (!totales.cargos) return 'Sin cargos emitidos'
  if (!totales.pendiente) return 'Pago total'
  return totales.pendiente < totales.cuotas + totales.reintegros ? 'Pago parcial' : 'Pendiente'
}

export const cajaExcelService = {
  async download(cuentas: CuentaCaja[]) {
    const { default: ExcelJS } = await import('exceljs')
    const fechaReporte = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
    const mesActual = fechaReporte.slice(0, 7)
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CCISJ'
    workbook.created = new Date()
    workbook.subject = 'Control de caja en pesos uruguayos. Pendientes al momento de la descarga; los cargos cubiertos incluyen saldo a favor.'

    const resumen = workbook.addWorksheet('Resumen')
    resumen.columns = [
      { header: 'Socio', key: 'socio', width: 36 },
      { header: 'BPS / Cédula', key: 'identificador', width: 22 },
      { header: 'Rubro', key: 'rubro', width: 26 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Saldo actual (UYU)', key: 'saldo', width: 22 },
      { header: 'Deuda total (UYU)', key: 'deuda', width: 22 },
      { header: 'Deuda vencida (UYU)', key: 'vencida', width: 24 },
      { header: 'Saldo a favor (UYU)', key: 'favor', width: 24 },
      { header: 'Mes actual', key: 'mes', width: 16 },
      { header: 'Cargos del mes (UYU)', key: 'total', width: 24 },
      { header: 'Cubierto del mes (UYU)', key: 'cubierto', width: 26 },
      { header: 'Pendiente del mes (UYU)', key: 'pendiente', width: 26 },
      { header: 'Estado del mes', key: 'estadoMes', width: 24 },
    ]

    const mensual = workbook.addWorksheet('Por mes')
    mensual.columns = [
      { width: 16 },
      { width: 24 },
      { width: 18 },
      { width: 18 },
      { width: 20 },
    ]
    const encabezadosMensuales: number[] = []
    const filasSocioMensuales: number[] = []

    for (const cuenta of cuentas) {
      const historial = await cajaService.getHistorial(cuenta.socioId)
      const socio = {
        socio: historial.razonSocial,
        identificador: historial.bps ?? '',
        rubro: historial.nombreRubro ?? '',
        telefono: cuenta.telefono ?? '',
        estado: estadoMorosidadLabel[historial.estadoMorosidad],
      }
      const identificadorSocio = historial.cedula
        ? `Cédula: ${historial.cedula}`
        : `BPS: ${historial.bps || '-'}`
      const meses = new Map<string, TotalesMes>()
      for (const movimiento of historial.movimientos) {
        const mes = movimiento.fecha.slice(0, 7)
        const totales = meses.get(mes) ?? totalesVacios()
        const monto = Math.round(movimiento.monto * 100)
        const pendiente = Math.round(movimiento.pendiente * 100)
        if (movimiento.tipo === 'PAGO') {
          totales.cobros += monto
        } else {
          if (movimiento.tipo === 'CUOTA') totales.cuotas += monto
          else totales.reintegros += monto
          totales.cargos += 1
          totales.pendiente += pendiente
        }
        meses.set(mes, totales)
      }

      const actual = meses.get(mesActual) ?? totalesVacios()
      resumen.addRow({
        ...socio, saldo: historial.saldo, deuda: Math.max(historial.saldo, 0),
        vencida: historial.deudaVencida, favor: Math.max(-historial.saldo, 0), mes: mesActual,
        total: (actual.cuotas + actual.reintegros) / 100,
        cubierto: (actual.cuotas + actual.reintegros - actual.pendiente) / 100,
        pendiente: actual.pendiente / 100, estadoMes: estadoDelMes(actual),
      })

      const bpsRow = mensual.addRow([identificadorSocio])
      mensual.mergeCells(bpsRow.number, 1, bpsRow.number, 5)
      bpsRow.font = { bold: true, size: 12, color: { argb: 'FF08775F' } }
      filasSocioMensuales.push(bpsRow.number)
      const socioRow = mensual.addRow([historial.razonSocial])
      mensual.mergeCells(socioRow.number, 1, socioRow.number, 5)
      socioRow.font = { bold: true }
      filasSocioMensuales.push(socioRow.number)
      const encabezado = mensual.addRow(['Fecha', 'Mes', 'Debe (UYU)', 'Haber (UYU)', 'Saldo (UYU)'])
      encabezadosMensuales.push(encabezado.number)

      for (const movimiento of historial.movimientos) {
        const esPago = movimiento.tipo === 'PAGO'
        mensual.addRow([
          new Date(`${movimiento.fecha.slice(0, 10)}T00:00:00Z`),
          movimiento.fecha.slice(0, 7),
          esPago ? 0 : movimiento.monto,
          esPago ? movimiento.monto : 0,
          movimiento.saldoResultante,
        ])
      }
      mensual.addRow([])
      mensual.addRow([])
    }

    const columnasMonetarias = new Set(['saldo', 'deuda', 'vencida', 'favor', 'total', 'cubierto', 'pendiente'])
    for (const hoja of workbook.worksheets) {
      if (hoja === resumen) {
        hoja.views = [{ state: 'frozen', ySplit: 1 }]
        hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: hoja.rowCount, column: hoja.columnCount } }
        hoja.getRow(1).height = 32
        hoja.getRow(1).eachCell((celda) => {
          celda.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF08775F' } }
          celda.alignment = { vertical: 'middle', wrapText: true }
        })
        hoja.columns.forEach((columna) => {
          if (columnasMonetarias.has(columna.key ?? '')) {
            columna.numFmt = '"$" #,##0.00;[Red]-"$" #,##0.00'
          }
        })
      } else {
        mensual.getColumn(1).numFmt = 'dd/mm/yyyy'
        for (const columna of [3, 4, 5]) {
          mensual.getColumn(columna).numFmt = '"$" #,##0.00;[Red]-"$" #,##0.00'
        }
      }
      hoja.eachRow((fila, indice) => {
        if (hoja === resumen && indice === 1) return
        if (hoja === mensual && (encabezadosMensuales.includes(indice) || filasSocioMensuales.includes(indice))) return
        fila.eachCell((celda) => {
          celda.alignment = { vertical: 'middle' }
          if (indice % 2 === 0) {
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F5' } }
          }
        })
      })
    }
    for (const filaNumero of encabezadosMensuales) {
      const fila = mensual.getRow(filaNumero)
      fila.height = 24
      fila.eachCell((celda) => {
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF08775F' } }
        celda.alignment = { vertical: 'middle', wrapText: true }
      })
    }

    const contenido = await workbook.xlsx.writeBuffer()
    const blob = new Blob([new Uint8Array(contenido)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `control-caja-${fechaReporte}.xlsx`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}