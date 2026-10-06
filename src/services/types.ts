export type Role = 'ADMIN' | 'SOCIO' | 'POSTULANTE'

export type EstadoMorosidad = 'AL_DIA' | 'MOROSO' | 'INACTIVO'

export type EstadoCuota = 'PENDIENTE' | 'PAGADO' | 'ANULADA'

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'COBRADOR'

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

export type CuentaCaja = {
  socioId: number
  bps: string | null
  razonSocial: string
  nombreRubro: string | null
  telefono: string | null
  estadoMorosidad: EstadoMorosidad
  cuotaId: number | null
  estadoCuota: EstadoCuota | null
  montoCuota: number | null
  montoTimbre: number | null
  timbreRecurrente: boolean
  periodo: string | null
  fechaVencimiento: string | null
}

export type CajaResumen = {
  totalSocios: number
  alDia: number
  pendiente: number
  inactivos: number
  cuentas: CuentaCaja[]
}

export type MovimientoCaja = {
  cuotaId: number
  periodo: string
  fechaVencimiento: string
  estadoCuota: EstadoCuota
  montoCuota: number
  montoTimbre: number
  timbreRecurrente: boolean
  montoCobrado: number | null
  fechaCobro: string | null
  metodoPago: MetodoPago | null
  nroCobranzaExterno: string | null
  observaciones: string | null
}

export type HistorialCaja = {
  socioId: number
  razonSocial: string
  bps: string | null
  nombreRubro: string | null
  estadoMorosidad: EstadoMorosidad
  movimientos: MovimientoCaja[]
}

export type RegistrarCobroPayload = {
  cuotaId: number
  metodoPago: MetodoPago
  montoTimbre?: number | null
  timbreRecurrente?: boolean | null
  nroCobranzaExterno?: string | null
  observaciones?: string | null
}

export type Tarifa = {
  id: number
  anio: number
  montoBase: number
  diaVencimiento: number
  createdAt: string
}

export type GuardarTarifaPayload = {
  anio: number
  montoBase: number
  diaVencimiento: number
}

export type FacturacionGenerada = {
  periodo: string
  tarifaId: number
  sociosActivos: number
  cuotasGeneradas: number
  cuotasExistentes: number
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
  libreta: string | null
  ultimoEmpleo: string | null
  descripcionExperiencia: string | null
  visible: boolean
  rubros: string[]
}

export type ApplicantProfileCard = {
  id: number
  fullName: string
  initials: string
  profileName: string
  categoryLabel: string
  location: string | null
  sectors: string[]
  availability: Availability
  license: string | null
  hasVehicle: boolean
  hasApplication: boolean
  hasCv: boolean
  identityCard: string | null
  age: number | null
  experienceSummary: string | null
  latestJob: string | null
  cvFileName: string | null
  cvMeta: string | null
}

export type SocioCvLink = { url: string }

export type PersonalProfile = {
  nombreCompleto: string
  cedulaIdentidad: string | null
  telefono: string | null
  zonaResidencia: string | null
  email: string
  fotoUrl: string | null
}

export type OfferStatus = 'ACTIVA' | 'PAUSADA' | 'CERRADA' | 'VENCIDA'
export type Availability = 'FULL_TIME' | 'PART_TIME' | 'INDEFINIDO'
export type ContractType = 'EFECTIVO' | 'TEMPORARIA' | 'ZAFRA' | 'PASANTIA'

export type JobOffer = {
  id: number
  socioId: number
  socioNombre: string
  rubroId: number
  rubro: string
  titulo: string
  cargo: string | null
  descripcion: string
  requisitos: string | null
  zona: string | null
  salario: string | null
  tipoContrato: ContractType | null
  disponibilidadHoraria: Availability
  vacantes: number
  fechaPublicacion: string
  fechaCierre: string | null
  estado: OfferStatus
  postulaciones: number
}

export type JobOfferPayload = Omit<JobOffer, 'id' | 'socioId' | 'socioNombre' | 'rubro' | 'fechaPublicacion' | 'estado' | 'postulaciones'> & {
  socioId?: number | null
}

export type ActiveSocioOption = { id: number; razonSocial: string }

export type ApplicantApplication = {
  id: number
  ofertaId: number
  ofertaTitulo: string
  socioNombre: string
  rubro: string
  fecha: string
  estado: 'RECIBIDA' | 'REVISADA' | 'CONTACTADA' | 'SELECCIONADA' | 'DESCARTADA'
  perfilId: number | null
  perfilNombre: string | null
  cvId: number | null
  cvNombre: string | null
}

export type ReceivedApplication = {
  id: number
  fullName: string
  initials: string
  profileId: number
  profileName: string
  location: string | null
  tags: string[]
  status: ApplicantApplication['estado']
  appliedOn: string
  availability: Availability
  hasVehicle: boolean
  license: string | null
  latestJob: string | null
  experienceSummary: string | null
  identityCard: string | null
  cvId: number | null
  cvFileName: string | null
  cvMeta: string | null
}

export type CvDownloadResponse = {
  url: string
}
