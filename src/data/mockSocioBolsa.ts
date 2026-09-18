export type Availability = 'FULL_TIME' | 'PART_TIME'
export type SortOption = 'updated' | 'name'

export type MockApplicantProfile = {
  id: string
  fullName: string
  initials: string
  profileName: string
  location: string
  tags: string[]
  sectors: string[]
  availability: Availability
  license: string
  hasVehicle: boolean
  updatedAt: string
}

export const mockCompany = {
  name: 'Distribuidora Fernandez',
  initials: 'DF',
  roleLabel: 'EMPRESA',
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
    location: 'San Jose de Mayo',
    tags: ['Ventas', 'At. al Cliente', 'Caja'],
    sectors: ['Ventas'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    updatedAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: '2',
    fullName: 'Carlos Mendez',
    initials: 'CM',
    profileName: 'Perfil Transporte y Logistica',
    location: 'Libertad',
    tags: ['Chofer', 'Reparto', 'Logistica'],
    sectors: ['Choferes', 'Logistica'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    updatedAt: '2026-09-15T18:00:00.000Z',
  },
  {
    id: '3',
    fullName: 'Laura Sosa',
    initials: 'LS',
    profileName: 'Perfil Administracion y Secretaria',
    location: 'Ciudad del Plata',
    tags: ['Administracion', 'Facturacion'],
    sectors: ['Administracion'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: false,
    updatedAt: '2026-09-14T12:00:00.000Z',
  },
  {
    id: '4',
    fullName: 'Roberto Perez',
    initials: 'RP',
    profileName: 'Perfil Ventas y Promocion',
    location: 'Libertad',
    tags: ['Ventas', 'Preventista'],
    sectors: ['Ventas'],
    availability: 'FULL_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    updatedAt: '2026-09-13T09:00:00.000Z',
  },
  {
    id: '5',
    fullName: 'Ana Silva',
    initials: 'AS',
    profileName: 'Perfil Contabilidad',
    location: 'San Jose de Mayo',
    tags: ['Contabilidad', 'Administracion'],
    sectors: ['Contabilidad', 'Administracion'],
    availability: 'PART_TIME',
    license: 'Cat. A',
    hasVehicle: false,
    updatedAt: '2026-09-12T16:00:00.000Z',
  },
  {
    id: '6',
    fullName: 'Diego Ramirez',
    initials: 'DR',
    profileName: 'Perfil Reparto',
    location: 'Libertad',
    tags: ['Repartidores', 'Logistica'],
    sectors: ['Repartidores', 'Logistica'],
    availability: 'PART_TIME',
    license: 'Cat. A, G2',
    hasVehicle: true,
    updatedAt: '2026-09-11T11:00:00.000Z',
  },
]
