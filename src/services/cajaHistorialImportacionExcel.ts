export const cajaHistorialImportacionExcel = {
  async downloadTemplate() {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CCISJ'

    const sheet = workbook.addWorksheet('Cuotas pagadas')
    sheet.columns = [
      { header: 'Periodo', key: 'periodo', width: 16 },
      { header: 'Monto cuota', key: 'montoCuota', width: 18 },
      { header: 'Fecha vencimiento', key: 'fechaVencimiento', width: 20 },
      { header: 'Fecha pago', key: 'fechaPago', width: 18 },
      { header: 'Monto pagado', key: 'montoPagado', width: 18 },
      { header: 'Metodo de pago', key: 'metodoPago', width: 22 },
      { header: 'Referencia', key: 'referencia', width: 28 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ]
    sheet.getColumn('periodo').numFmt = '@'
    sheet.getColumn('montoCuota').numFmt = '#,##0.00'
    sheet.getColumn('fechaVencimiento').numFmt = 'dd/mm/yyyy'
    sheet.getColumn('fechaPago').numFmt = 'dd/mm/yyyy'
    sheet.getColumn('montoPagado').numFmt = '#,##0.00'
    for (let rowNumber = 2; rowNumber <= 501; rowNumber += 1) {
      sheet.getCell(rowNumber, 6).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"EFECTIVO,TRANSFERENCIA,COBRADOR"'],
      }
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } }
    sheet.getRow(1).height = 32
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF08775F' } }
    })

    const instructions = workbook.addWorksheet('Instrucciones')
    instructions.addRows([
      ['Una fila por cada pago de una cuota mensual de este socio.'],
      ['Periodo: AAAA-MM. Ejemplo: 2024-03.'],
      ['Monto cuota y Fecha vencimiento deben repetirse en todas las filas del mismo período.'],
      ['Si una cuota se pagó en varios pagos, agrega una fila por pago. La suma de Monto pagado del período debe igualar Monto cuota.'],
      ['Fecha vencimiento y Fecha pago deben ser fechas reales, en formato AAAA-MM-DD o DD/MM/AAAA. No se aceptan pagos futuros.'],
      ['Metodo de pago: EFECTIVO, TRANSFERENCIA o COBRADOR.'],
      ['Referencia y Observaciones son opcionales.'],
      ['Los períodos que ya tienen una cuota se omiten como duplicados.'],
      ['No agregues filas de ejemplo: cada fila de la primera hoja se procesa como un registro real.'],
    ])
    instructions.getColumn(1).width = 110
    instructions.eachRow((row) => {
      row.eachCell((cell) => { cell.alignment = { vertical: 'middle', wrapText: true } })
    })

    const content = await workbook.xlsx.writeBuffer()
    const blob = new Blob([new Uint8Array(content)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla-historial-cuotas-pagadas.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
