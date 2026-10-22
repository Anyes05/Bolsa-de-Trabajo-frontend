/** Localidades del departamento de San José (catálogo compartido en todo el sistema). */
export const LOCALIDADES_SAN_JOSE = [
  'San José de Mayo',
  'Ciudad del Plata',
  'Libertad',
  'Rodríguez',
  'Ecilda Paullier',
  'Puntas de Valdez',
  'Rafael Perazza',
  'Kiyú-Ordeig',
  'Villa María',
  'Raigón',
  'Juan Soler',
  'Mal Abrigo',
  'Capurro',
  'Ituzaingó',
  '18 de Julio',
  'Monte Grande',
  'Otra localidad',
] as const

/** Opciones para un select, agregando el valor actual si viene de datos anteriores. */
export function localidadesConActual(actual: string | null | undefined): string[] {
  const value = (actual ?? '').trim()
  if (value && !LOCALIDADES_SAN_JOSE.includes(value as (typeof LOCALIDADES_SAN_JOSE)[number])) {
    return [value, ...LOCALIDADES_SAN_JOSE]
  }
  return [...LOCALIDADES_SAN_JOSE]
}
