export type DirectoryStatus = 'Al dia' | 'Pendiente' | 'Inactivo'

export type MockDirectoryMember = {
  id: string
  razonSocial: string
  alta: string
  rubro: string
  telefono: string
  email: string
  status: DirectoryStatus
}

export const mockDirectivoCompany = {
  name: 'Constructora Palleiro S.R.L.',
  initials: 'CP',
  roleLabel: 'SOCIO',
}

export const DIRECTIVO_EMAILS = ['socio.directivo@ccisj.org.uy']

export function isDirectivoEmail(email: string | null | undefined) {
  return DIRECTIVO_EMAILS.includes((email ?? '').trim().toLowerCase())
}

export const mockDirectoryStatuses: Array<'Todos' | DirectoryStatus> = [
  'Todos',
  'Al dia',
  'Pendiente',
  'Inactivo',
]

export const mockDirectoryMembers: MockDirectoryMember[] = [
  {
    id: '1',
    razonSocial: 'Distribuidora Fernandez Hnos.',
    alta: '2020-03-15',
    rubro: 'Distribucion',
    telefono: '099 123 456',
    email: 'fernandez@ccisj.org.uy',
    status: 'Al dia',
  },
  {
    id: '2',
    razonSocial: 'Supermercado Don Carlos',
    alta: '2019-07-01',
    rubro: 'Comercio',
    telefono: '098 234 567',
    email: 'doncarlos@ccisj.org.uy',
    status: 'Al dia',
  },
  {
    id: '3',
    razonSocial: 'Muebleria La Estrella',
    alta: '2021-01-10',
    rubro: 'Muebleria',
    telefono: '097 345 678',
    email: 'estrella@gmail.com',
    status: 'Pendiente',
  },
  {
    id: '4',
    razonSocial: 'Taller Mecanico Rodriguez',
    alta: '2018-05-20',
    rubro: 'Automotriz',
    telefono: '096 456 789',
    email: 'taller.rod@gmail.com',
    status: 'Inactivo',
  },
  {
    id: '5',
    razonSocial: 'Ferreteria El Martillo',
    alta: '2022-02-28',
    rubro: 'Ferreteria',
    telefono: '095 567 890',
    email: 'elmartillo@gmail.com',
    status: 'Al dia',
  },
  {
    id: '6',
    razonSocial: 'Panaderia San Jose S.A.',
    alta: '2017-11-03',
    rubro: 'Alimentacion',
    telefono: '094 678 901',
    email: 'pansanjose@gmail.com',
    status: 'Inactivo',
  },
  {
    id: '7',
    razonSocial: 'Libreria & Papeleria Norte',
    alta: '2023-04-12',
    rubro: 'Papeleria',
    telefono: '092 890 123',
    email: 'libnorte@gmail.com',
    status: 'Pendiente',
  },
  {
    id: '8',
    razonSocial: 'Constructora Palleiro S.R.L.',
    alta: '2016-09-05',
    rubro: 'Construccion',
    telefono: '091 901 234',
    email: 'palleiro@gmail.com',
    status: 'Al dia',
  },
  {
    id: '9',
    razonSocial: 'Optica Vision Plena',
    alta: '2024-01-18',
    rubro: 'Salud',
    telefono: '090 012 345',
    email: 'visionplena@gmail.com',
    status: 'Al dia',
  },
]
