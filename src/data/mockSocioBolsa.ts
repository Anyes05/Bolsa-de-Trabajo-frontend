export type Availability = 'FULL_TIME' | 'PART_TIME'
export type SortOption = 'updated' | 'name'

export type MockApplicantProfile = {
  id: string
  fullName: string
  initials: string
  profileName: string
  categoryLabel: string
  location: string
  identityCard: string
  age: number
  tags: string[]
  sectors: string[]
  interests: string[]
  availability: Availability
  license: string
  hasVehicle: boolean
  experienceSummary: string
  latestJob: string
  cvFileName: string
  cvMeta: string
  updatedAt: string
}

export const availabilityLabel: Record<Availability, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
}

export const mockCompany = {
  name: 'Distribuidora Fernandez',
  initials: 'DF',
  roleLabel: 'SOCIO',
}

export const mockRubros = [
  'Todos',
  'Ventas',
  'Repartidores',
  'Administracion',
  'Choferes',
  'Contabilidad',
  'Logistica',
]

export const mockApplicantProfiles: MockApplicantProfile[] = [
  {
    id: '1',
    fullName: 'Maria Gonzalez',
    initials: 'MG',
    profileName: 'Perfil Ventas y Atencion al Cliente',
    categoryLabel: 'VENTAS Y ATENCION',
    location: 'San Jose de Mayo',
    identityCard: '4.512.883-1',
    age: 32,
    tags: ['Ventas', 'At. al Cliente', 'Caja'],
    sectors: ['Ventas'],
    interests: ['Ventas', 'Atencion al cliente', 'Caja'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    experienceSummary: 'Atencion al publico, cobranzas y reposicion en comercios de San Jose. Buen manejo de caja y trato con clientes.',
    latestJob: 'Cajera - Super San Jose (2021 - 2025)',
    cvFileName: 'MariaGonzalez_CV_CCISJ.pdf',
    cvMeta: 'PDF oficial verificado · 180 KB',
    updatedAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: '2',
    fullName: 'Carlos Mendez',
    initials: 'CM',
    profileName: 'Perfil Transporte y Logistica',
    categoryLabel: 'TRANSPORTE Y LOGISTICA',
    location: 'Libertad, San Jose',
    identityCard: '3.987.654-2',
    age: 28,
    tags: ['Chofer', 'Reparto', 'Logistica'],
    sectors: ['Choferes', 'Logistica'],
    interests: ['Choferes', 'Repartidores', 'Peon de carga'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    experienceSummary: 'Experiencia solida como repartidor y conductor de vehiculos de mediana carga. 5 anos trabajando en rutas locales y de media distancia.',
    latestJob: 'Repartidor local - Distribuidora del Sur (2022 - 2025)',
    cvFileName: 'CarlosMendez_CV_CCISJ.pdf',
    cvMeta: 'PDF oficial verificado · 245 KB',
    updatedAt: '2026-09-15T18:00:00.000Z',
  },
  {
    id: '3',
    fullName: 'Laura Sosa',
    initials: 'LS',
    profileName: 'Perfil Administracion y Secretaria',
    categoryLabel: 'ADMINISTRACION',
    location: 'Ciudad del Plata, San Jose',
    identityCard: '5.102.447-8',
    age: 41,
    tags: ['Administracion', 'Facturacion'],
    sectors: ['Administracion'],
    interests: ['Administracion', 'Facturacion', 'Recepcion'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: false,
    experienceSummary: 'Gestion administrativa, agenda y facturacion electronica en estudios y empresas locales.',
    latestJob: 'Administrativa - Estudio Contable Rios (2019 - 2025)',
    cvFileName: 'LauraSosa_CV_CCISJ.pdf',
    cvMeta: 'PDF oficial verificado · 210 KB',
    updatedAt: '2026-09-14T12:00:00.000Z',
  },
  {
    id: '4',
    fullName: 'Roberto Perez',
    initials: 'RP',
    profileName: 'Perfil Ventas y Promocion',
    categoryLabel: 'VENTAS',
    location: 'Libertad, San Jose',
    identityCard: '3.220.119-4',
    age: 36,
    tags: ['Ventas', 'Preventista'],
    sectors: ['Ventas'],
    interests: ['Ventas', 'Preventista', 'Atencion al cliente'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    experienceSummary: 'Preventista con recorridos en comercios de San Jose. Experiencia en pedidos, cobranzas y promociones en gondola.',
    latestJob: 'Preventista - Distribuidora del Litoral (2020 - 2025)',
    cvFileName: 'RobertoPerez_CV_CCISJ.pdf',
    cvMeta: 'PDF oficial verificado · 198 KB',
    updatedAt: '2026-09-13T09:00:00.000Z',
  },
  {
    id: '5',
    fullName: 'Ana Silva',
    initials: 'AS',
    profileName: 'Perfil Contabilidad',
    categoryLabel: 'CONTABILIDAD',
    location: 'San Jose de Mayo',
    identityCard: '4.887.201-0',
    age: 29,
    tags: ['Contabilidad', 'Administracion'],
    sectors: ['Contabilidad', 'Administracion'],
    interests: ['Contabilidad', 'Administracion', 'Tesoreria'],
    availability: 'PART_TIME',
    license: 'Cat. A',
    hasVehicle: false,
    experienceSummary: 'Asistente contable con manejo de liquidaciones, conciliaciones y DGI. Disponibilidad part-time.',
    latestJob: 'Auxiliar contable - Cooperativa San Jose (2023 - 2025)',
    cvFileName: 'AnaSilva_CV_CCISJ.pdf',
    cvMeta: 'PDF oficial verificado · 164 KB',
    updatedAt: '2026-09-12T16:00:00.000Z',
  },
  {
    id: '6',
    fullName: 'Diego Ramirez',
    initials: 'DR',
    profileName: 'Perfil Reparto',
    categoryLabel: 'TRANSPORTE Y LOGISTICA',
    location: 'Libertad, San Jose',
    identityCard: '5.640.332-6',
    age: 24,
    tags: ['Repartidores', 'Logistica'],
    sectors: ['Repartidores', 'Logistica'],
    interests: ['Repartidores', 'Logistica', 'Deposito'],
    availability: 'PART_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    experienceSummary: 'Reparto urbano con moto y utilitario liviano. Experiencia en armado de pedidos y entregas a domicilio.',
    latestJob: 'Repartidor - Mercado Local Libertad (2023 - 2025)',
    cvFileName: 'DiegoRamirez_CV_CCISJ.pdf',
    cvMeta: 'PDF oficial verificado · 152 KB',
    updatedAt: '2026-09-11T11:00:00.000Z',
  },
]
