import { jsPDF } from 'jspdf'

// Un dato del CV con su etiqueta ("Cargo", "Empresa"...). Los vacíos no se imprimen.
export type CvField = [label: string, value: string | null | undefined]

export type CvSection = {
  title: string
  // Texto libre de la sección (resumen, habilidades...).
  text?: string
  // Entradas con datos etiquetados (cada experiencia, formación, referencia...).
  entries?: CvField[][]
}

export type ManualCvDocument = {
  fullName: string
  header: CvField[]
  sections: CvSection[]
}

const MARGIN = 14
const CONTENT_WIDTH = 182
const VALUE_X = 52
const VALUE_WIDTH = MARGIN + CONTENT_WIDTH - VALUE_X
const LINE = 5
const GREEN: [number, number, number] = [0, 112, 62]

const filled = (fields: CvField[]) => fields.filter(([, value]) => value?.trim())

export function buildManualCvPdf(cv: ManualCvDocument): File {
  const doc = new jsPDF()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 20

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      doc.addPage()
      y = 20
    }
  }

  const writeField = ([label, value]: CvField) => {
    const lines = doc.splitTextToSize(String(value).trim(), VALUE_WIDTH)
    ensureSpace(lines.length * LINE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(`${label}:`, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(lines, VALUE_X, y)
    y += lines.length * LINE + 1
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...GREEN)
  doc.text(cv.fullName.trim() || 'Curriculum Vitae', MARGIN, y)
  y += 10
  filled(cv.header).forEach(writeField)
  y += 4

  cv.sections.forEach((section) => {
    const text = section.text?.trim() ?? ''
    const entries = (section.entries ?? []).map(filled).filter((entry) => entry.length)
    if (!text && !entries.length) return

    ensureSpace(14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...GREEN)
    doc.text(section.title, MARGIN, y)
    y += 2
    doc.setDrawColor(...GREEN)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 6

    if (text) {
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
      ensureSpace(lines.length * LINE)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(lines, MARGIN, y)
      y += lines.length * LINE + 2
    }
    entries.forEach((entry) => {
      entry.forEach(writeField)
      y += 3
    })
    y += 3
  })

  return new File([doc.output('blob')], 'cv-manual.pdf', { type: 'application/pdf' })
}

// Los campos de mes guardan "2022-03"; en el CV se muestran como "03/2022".
const monthYear = (value: string) => value.replace(/^(\d{4})-(\d{2})$/, '$2/$1')

export const period = (from?: string | null, to?: string | null) =>
  [from, to].filter((value): value is string => Boolean(value?.trim())).map(monthYear).join(' a ')
