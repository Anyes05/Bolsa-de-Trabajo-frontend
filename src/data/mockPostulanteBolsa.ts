export type PostulantePerfil = {
  id: number
  name: string
  visibility: 'VISIBLE' | 'HIDDEN'
  availability: string
  skills: string[]
  latestJob: string
  summary: string
  hasVehicle: boolean
}

export type OfertaActiva = {
  id: number
  title: string
  company: string
  category: string
  location: string
  schedule: string
  publishedAgo: string
  description: string
  applied: boolean
  appliedDate?: string
}

export type Postulacion = {
  id: number
  title: string
  company: string
  profileName: string
  location: string
  appliedDate: string
  status: 'Pendiente'
}

export const postulanteDisplay = {
  fullName: 'Maria Gonzalez',
  initials: 'MG',
  roleLabel: 'POSTULANTE',
}

export const perfilesMock: PostulantePerfil[] = [
  {
    id: 1,
    name: 'Administracion y Ventas (Comercio)',
    visibility: 'VISIBLE',
    availability: 'Lunes a Viernes, Horario de Comercio',
    skills: ['Administracion', 'Ventas', 'Atencion al Cliente', 'Excel', 'Facturacion'],
    latestJob: 'Cajera y Vendedora en Supermercado Don Carlos (1 ano y 3 meses)',
    summary: 'Experiencia desempenando tareas de atencion al publico, manejo de caja, facturacion y reposicion.',
    hasVehicle: true,
  },
  {
    id: 2,
    name: 'Desarrollo Web & IT',
    visibility: 'HIDDEN',
    availability: 'Remoto / Cualquier Horario',
    skills: ['React', 'TypeScript', 'Node.js', 'MySQL', 'Ingles Avanzado'],
    latestJob: 'Desarrolladora Web Frontend en Software House Uruguay (Junior)',
    summary: 'Participacion en interfaces web con foco en calidad visual y experiencia de usuario.',
    hasVehicle: false,
  },
]

export const ofertasActivasMock: OfertaActiva[] = [
  {
    id: 11,
    title: 'Auxiliar Administrativo Contable',
    company: 'Estudio Contable S.R.L.',
    category: 'Administracion',
    location: 'San Jose de Mayo',
    schedule: 'Lunes a Viernes (Horario Comercial)',
    publishedAgo: 'Publicado hace 2 dias',
    description: 'Buscamos una persona proactiva para incorporarse a nuestra firma. Tareas de conciliaciones bancarias, facturacion y apoyo en gestiones generales del estudio.',
    applied: false,
  },
  {
    id: 12,
    title: 'Vendedor de Salon para temporada',
    company: 'Giga Comercio S.A.',
    category: 'Ventas',
    location: 'San Jose de Mayo',
    schedule: 'Turno Rotativo',
    publishedAgo: 'Publicado hace 1 semana',
    description: 'Importante comercio centrico selecciona personal para atencion directa al publico. Excelente presencia, simpatia y experiencia previa en atencion al cliente.',
    applied: true,
    appliedDate: '15/02/2026',
  },
]

export const postulacionesMock: Postulacion[] = [
  {
    id: 22,
    title: 'Vendedor de Salon para temporada',
    company: 'Giga Comercio S.A.',
    profileName: 'Administracion y Ventas (Comercio)',
    location: 'San Jose de Mayo',
    appliedDate: '15/02/2026',
    status: 'Pendiente',
  },
]
