import ExcelJS from 'exceljs'
import { socioService, type SocioImportRow, type SocioImportResult } from './socioService'

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim()
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue)
  }
  return String(value).trim()
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function mapHeader(header: string): keyof SocioImportRow | null {
  const key = normalizeHeader(header)
  if (key.includes('razon social') || key.includes('nombre o razon')) return 'razonSocial'
  if (key === 'direccion' || key.includes('direccion')) return 'direccion'
  if (key.includes('celular')) return 'celular'
  if (key === 'telefono' || key.includes('telefono')) return 'telefono'
  if (key.includes('localidad')) return 'localidad'
  if (key === 'giro' || key.includes('giro') || key.includes('rubro')) return 'giro'
  if (key === 'mail' || key.includes('email') || key.includes('correo')) return 'mail'
  if (key === 'rut' || key.includes('rut')) return 'rut'
  if (key.includes('bps')) return 'bps'
  if (key.includes('afiliacion') || key.includes('fecha de afili')) return 'fechaAfiliacion'
  if (key === 'inicio') return 'inicio'
  if (key === 'mes') return 'mes'
  return null
}

export async function parseSociosExcel(file: File): Promise<SocioImportRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headerRow = sheet.getRow(1)
  const columnMap = new Map<number, keyof SocioImportRow>()
  headerRow.eachCell((cell, colNumber) => {
    const mapped = mapHeader(cellText(cell.value))
    if (mapped) columnMap.set(colNumber, mapped)
  })

  const rows: SocioImportRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const item: SocioImportRow = { razonSocial: '' }
    columnMap.forEach((field, colNumber) => {
      const text = cellText(row.getCell(colNumber).value)
      if (!text) return
      if (field === 'razonSocial') item.razonSocial = text
      else if (field === 'esDirectivo') item.esDirectivo = /^(si|sí|true|1|x)$/i.test(text)
      else item[field] = text
    })
    if (item.razonSocial.trim()) rows.push(item)
  })
  return rows
}

export async function importSociosExcel(file: File): Promise<SocioImportResult> {
  const rows = await parseSociosExcel(file)
  if (!rows.length) {
    return {
      totalFilas: 0,
      creados: 0,
      omitidos: 0,
      errores: 0,
      mensajes: ['No se encontraron filas con razón social en el Excel.'],
    }
  }
  return socioService.importPadron(rows)
}
