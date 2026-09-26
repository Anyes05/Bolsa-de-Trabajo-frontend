export type Role = 'ADMIN' | 'SOCIO' | 'POSTULANTE'

export type EstadoMorosidad = 'AL_DIA' | 'DEUDA_A_VENCER' | 'DEUDA_VENCIDA' | 'INACTIVO'

export type RubroOption = {
  id: number
  nombreRubro: string
}

export type SocioRecord = {
  id: number
  bps: string | null
  razonSocial: string
  rut: string | null
  giro: string | null
  telefono: string | null
  emailContacto: string | null
  emailUsuario: string | null
  calle: string | null
  numero: string | null
  localidad: string | null
  rubroId: number | null
  nombreRubro: string | null
  estadoMorosidad: EstadoMorosidad
  esDirectivo: boolean
  fechaAlta: string | null
  fechaBaja: string | null
  fechaAniversario: string | null
  activo: boolean
}

export type SocioCreatePayload = {
  bps: string
  email: string
  password: string
  razonSocial: string
  rut: string
  giro?: string | null
  telefono?: string | null
  emailContacto?: string | null
  calle: string
  numero?: string | null
  localidad: string
  rubroId: number
  esDirectivo: boolean
  fechaAniversario?: string | null
}

export type SocioUpdatePayload = {
  razonSocial: string
  rut: string
  giro?: string | null
  telefono?: string | null
  emailContacto?: string | null
  calle: string
  numero?: string | null
  localidad: string
  rubroId: number
  esDirectivo: boolean
  fechaAniversario?: string | null
  estadoMorosidad?: EstadoMorosidad | null
}

export type AuthResponse = {
  token: string
  email: string
  role: Role
  fullName?: string | null
  esDirectivo?: boolean | null
}

export type CurrentUserResponse = {
  email: string
  roles: unknown[]
  fullName: string | null
  esDirectivo?: boolean | null
}

export type RegisterApplicantPayload = {
  fullName: string
  identityCard: string
  phone: string
  email: string
  password: string
  residenceArea: string
  profileName: string
  sectors: string[]
  availability: 'FULL_TIME' | 'PART_TIME'
  hasVehicle: boolean
  latestJob: string
  experienceDescription: string
}

export type CvResponse = {
  id: number
  perfilLaboralId: number | null
  version: number
  resumen: string | null
  nombreArchivo: string | null
  mimeType: string | null
  sizeBytes: number | null
  activo: boolean
  fechaCarga: string
  downloadUrl: string
}

export type ProfessionalProfile = {
  id: number
  nombre: string
  disponibilidadHoraria: 'FULL_TIME' | 'PART_TIME' | 'INDEFINIDO'
  tieneVehiculo: boolean
  ultimoEmpleo: string | null
  descripcionExperiencia: string | null
  visible: boolean
  rubros: string[]
}

export type CvDownloadResponse = {
  url: string
}
