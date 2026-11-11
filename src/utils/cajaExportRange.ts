export type CajaExportRange = { desde?: string; hasta?: string }

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function cajaExportRangeError({ desde, hasta }: CajaExportRange) {
  if ((desde && !validDate(desde)) || (hasta && !validDate(hasta))) return 'Ingresá fechas válidas.'
  if (desde && hasta && desde > hasta) return 'La fecha Desde no puede ser posterior a Hasta.'
  return ''
}

export function filterCajaExportMovements<T extends { fecha: string }>(items: T[], range: CajaExportRange) {
  const error = cajaExportRangeError(range)
  if (error) throw new Error(error)
  return items.filter((item) => {
    const date = item.fecha.slice(0, 10)
    return (!range.desde || date >= range.desde) && (!range.hasta || date <= range.hasta)
  })
}
