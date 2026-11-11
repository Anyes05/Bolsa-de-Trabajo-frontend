export const CAMPO_FICTICIO_LABEL: Record<string, string> = {
  bps: 'BPS',
  rut: 'RUT',
  telefono: 'Teléfono',
  emailContacto: 'Email de contacto',
  emailUsuario: 'Email de cuenta',
  calle: 'Calle',
  numero: 'Nro. de puerta',
  localidad: 'Localidad',
  rubro: 'Rubro',
  fechaAlta: 'Fecha de alta',
  fechaAniversario: 'Fecha de aniversario',
}

export function isCampoFicticio(campos: string[] | null | undefined, campo: string) {
  return Boolean(campos?.includes(campo))
}

export function labelsCamposFicticios(campos: string[] | null | undefined) {
  return (campos ?? []).map((campo) => CAMPO_FICTICIO_LABEL[campo] ?? campo)
}
