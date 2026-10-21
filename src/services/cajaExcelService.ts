import { cajaService } from './cajaService'
import { estadoMorosidadLabel } from './socioService'
import type { CuentaCaja } from './types'

type TotalesMes = {
  cuotas: number
  reintegros: number
  pendiente: number
  cobros: number
  credito: number
  cargos: number
}

function totalesVacios(): TotalesMes {
  return { cuotas: 0, reintegros: 0, pendiente: 0, cobros: 0, credito: 0, cargos: 0 }
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
      { header: 'RUT / Cédula', key: 'identificador', width: 22 },
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
      { header: 'Socio', key: 'socio', width: 36 },
      { header: 'RUT / Cédula', key: 'identificador', width: 22 },
      { header: 'Mes del cargo / cobro', key: 'mes', width: 24 },
      { header: 'Cuotas (UYU)', key: 'cuotas', width: 20 },
      { header: 'Reintegros (UYU)', key: 'reintegros', width: 22 },
      { header: 'Total emitido (UYU)', key: 'total', width: 24 },
      { header: 'Total cubierto (UYU)', key: 'cubierto', width: 24 },
      { header: 'Saldo a favor utilizado (UYU)', key: 'credito', width: 32 },
      { header: 'Pendiente actual (UYU)', key: 'pendiente', width: 26 },
      { header: 'Cobros recibidos en el mes (UYU)', key: 'cobros', width: 36 },
      { header: 'Estado del mes', key: 'estadoMes', width: 24 },
    ]

    const deudas = workbook.addWorksheet('Deudas')
    deudas.columns = [
      { header: 'Socio', key: 'socio', width: 36 },
      { header: 'RUT / Cédula', key: 'identificador', width: 22 },
      { header: 'Mes correspondiente', key: 'mes', width: 24 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Concepto', key: 'concepto', width: 40 },
      { header: 'Vencimiento', key: 'vencimiento', width: 18, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Monto original (UYU)', key: 'monto', width: 24 },
      { header: 'Monto cubierto (UYU)', key: 'cubierto', width: 24 },
      { header: 'Pendiente actual (UYU)', key: 'pendiente', width: 26 },
    ]

    for (const cuenta of cuentas) {
      const historial = await cajaService.getHistorial(cuenta.socioId)
      const socio = {
        socio: historial.razonSocial,
        identificador: historial.cedula || historial.rut || '',
        rubro: historial.nombreRubro ?? '',
        telefono: cuenta.telefono ?? '',
        estado: estadoMorosidadLabel[historial.estadoMorosidad],
      }
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
          totales.credito += Math.round((movimiento.saldoFavorUtilizado ?? 0) * 100)
          if (pendiente > 0) {
            deudas.addRow({
              ...socio, mes, tipo: movimiento.tipo === 'CUOTA' ? 'Cuota' : 'Reintegro',
              concepto: movimiento.concepto,
              vencimiento: movimiento.fechaVencimiento
                ? new Date(`${movimiento.fechaVencimiento.slice(0, 10)}T00:00:00Z`) : null,
              monto: monto / 100, cubierto: (monto - pendiente) / 100, pendiente: pendiente / 100,
            })
          }
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
      for (const [mes, totales] of [...meses.entries()].sort(([primero], [segundo]) => primero.localeCompare(segundo))) {
        mensual.addRow({
          ...socio, mes, cuotas: totales.cuotas / 100, reintegros: totales.reintegros / 100,
          total: (totales.cuotas + totales.reintegros) / 100,
          cubierto: (totales.cuotas + totales.reintegros - totales.pendiente) / 100,
          credito: totales.credito / 100, pendiente: totales.pendiente / 100,
          cobros: totales.cobros / 100, estadoMes: estadoDelMes(totales),
        })
      }
    }

    const columnasMonetarias = new Set([
      'saldo', 'deuda', 'vencida', 'favor', 'total', 'cubierto', 'pendiente',
      'cuotas', 'reintegros', 'credito', 'cobros', 'monto',
    ])
    for (const hoja of workbook.worksheets) {
      hoja.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }]
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
      hoja.eachRow((fila, indice) => {
        if (indice === 1) return
        fila.eachCell((celda) => {
          celda.alignment = { vertical: 'middle' }
          if (indice % 2 === 0) {
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F5' } }
          }
        })
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