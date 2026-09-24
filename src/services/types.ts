export type Role = 'ADMIN' | 'SOCIO' | 'POSTULANTE'

export type AuthResponse = {
  token: string
  email: string
  role: Role
  fullName?: string | null
}

export type CurrentUserResponse = {
  email: string
  roles: unknown[]
  fullName: string | null
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
