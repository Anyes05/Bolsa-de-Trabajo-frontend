import type { Availability } from './mockSocioBolsa'

export type OfferStatus = 'Activa' | 'Pausada' | 'Cerrada'
export type ApplicationStatus = 'Contactada' | 'Pendiente'

export type MockSocioOffer = {
  id: string
  title: string
  sector: string
  zone: string
  availability: Availability
  salary: string
  description: string
  requirements: string
  status: OfferStatus
}

export type MockOfferApplication = {
  id: string
  offerId: string
  profileId: string
  fullName: string
  initials: string
  profileName: string
  location: string
  tags: string[]
  status: ApplicationStatus
  appliedOn: string
}

export const mockOfferSectors = [
  'Ventas',
  'Repartidores',
  'Administracion',
  'Choferes',
  'Contabilidad',
  'Logistica',
]

export const mockOfferZones = [
  'San Jose de Mayo',
  'Libertad',
  'Ciudad del Plata',
  'Rodriguez',
  'Ecilda Paullier',
]

export const mockSocioOffers: MockSocioOffer[] = [
  {
    id: '1',
    title: 'Repartidor/a Zona San Jose',
    sector: 'Repartidores',
    zone: 'San Jose de Mayo',
    availability: 'FULL_TIME',
    salary: '$28.000 – $32.000',
    description: 'Buscamos repartidor para cubrir zona departamental. Se provee vehiculo.',
    requirements: 'Carnet B vigente. Disponibilidad inmediata.',
    status: 'Activa',
  },
  {
    id: '2',
    title: 'Vendedor/a Mostrador',
    sector: 'Ventas',
    zone: 'San Jose de Mayo',
    availability: 'PART_TIME',
    salary: '$18.000 – $22.000',
    description: 'Atencion al publico en mostrador y gestion de pedidos.',
    requirements: 'Experiencia en ventas. Buen trato con el cliente.',
    status: 'Pausada',
  },
]

export const mockOfferApplications: MockOfferApplication[] = [
  {
    id: 'a1',
    offerId: '1',
    profileId: '2',
    fullName: 'Carlos Mendez',
    initials: 'CM',
    profileName: 'Perfil Transporte y Logistica',
    location: 'Libertad',
    tags: ['Choferes', 'Repartidores'],
    status: 'Contactada',
    appliedOn: '11/8/2026',
  },
  {
    id: 'a2',
    offerId: '1',
    profileId: '4',
    fullName: 'Roberto Perez',
    initials: 'RP',
    profileName: 'Perfil Ventas',
    location: 'Rodriguez',
    tags: ['Ventas'],
    status: 'Pendiente',
    appliedOn: '13/8/2026',
  },
  {
    id: 'a3',
    offerId: '2',
    profileId: '1',
    fullName: 'Maria Gonzalez',
    initials: 'MG',
    profileName: 'Perfil Ventas y Atencion al Cliente',
    location: 'San Jose de Mayo',
    tags: ['Ventas', 'At. al Cliente'],
    status: 'Pendiente',
    appliedOn: '20/8/2026',
  },
]

export function emptyOfferForm(): MockSocioOffer {
  return {
    id: '',
    title: '',
    sector: '',
    zone: '',
    availability: 'FULL_TIME',
    salary: '',
    description: '',
    requirements: '',
    status: 'Activa',
  }
}
