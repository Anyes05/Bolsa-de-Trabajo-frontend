import { estadoMorosidadLabel } from './socioService'
import type { SocioRecord } from './types'

function excelDate(value: string | null) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : date
}

export const sociosExcelService = {
  async download(socios: SocioRecord[]) {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CCISJ'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('Socios')
    sheet.columns = [
      { header: 'Razón social', key: 'razonSocial', width: 36 },
      { header: 'BPS', key: 'bps', width: 22 },
      { header: 'Cédula', key: 'cedula', width: 18 },
      { header: 'RUT', key: 'rut', width: 24 },
      { header: 'Rubro', key: 'nombreRubro', width: 36 },
      { header: 'Teléfono', key: 'telefono', width: 22 },
      { header: 'Email de contacto', key: 'emailContacto', width: 36 },
      { header: 'Email de cuenta', key: 'emailUsuario', width: 36 },
      { header: 'Calle', key: 'calle', width: 30 },
      { header: 'Número', key: 'numero', width: 14 },
      { header: 'Localidad', key: 'localidad', width: 24 },
      { header: 'Estado de morosidad', key: 'estadoMorosidad', width: 24 },
      { header: 'Directivo', key: 'esDirectivo', width: 14 },
      { header: 'Fecha de alta', key: 'fechaAlta', width: 20 },
      { header: 'Fecha de baja', key: 'fechaBaja', width: 20 },
      { header: 'Fecha de aniversario', key: 'fechaAniversario', width: 24 },
      { header: 'Activo', key: 'activo', width: 14 },
    ]
    for (const socio of socios) {
      sheet.addRow({
        razonSocial: socio.razonSocial,
        bps: socio.bps, cedula: socio.cedula, rut: socio.rut,
        nombreRubro: socio.nombreRubro,
        telefono: socio.telefono, emailContacto: socio.emailContacto, emailUsuario: socio.emailUsuario,
        calle: socio.calle, numero: socio.numero, localidad: socio.localidad,
        estadoMorosidad: estadoMorosidadLabel[socio.estadoMorosidad],
        esDirectivo: socio.esDirectivo ? 'Sí' : 'No',
        fechaAlta: excelDate(socio.fechaAlta), fechaBaja: excelDate(socio.fechaBaja),
        fechaAniversario: excelDate(socio.fechaAniversario), activo: socio.activo ? 'Sí' : 'No',
      })
    }
    for (const key of ['fechaAlta', 'fechaBaja', 'fechaAniversario']) {
      sheet.getColumn(key).numFmt = 'dd/mm/yyyy'
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } }
    sheet.getRow(1).height = 32
    sheet.eachRow((row, index) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true }
        if (index === 1) {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF08775F' } }
        } else if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F5' } }
        }
      })
    })
    const content = await workbook.xlsx.writeBuffer()
    const blob = new Blob([new Uint8Array(content)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const date = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `socios-${date}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}