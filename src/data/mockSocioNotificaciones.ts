export type NotificationKind = 'asamblea' | 'cuota' | 'bienvenida' | 'mantenimiento'

export type MockSocioNotification = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  date: string
  unread: boolean
  popup: boolean
}

export const mockSocioNotifications: MockSocioNotification[] = [
  {
    id: '1',
    kind: 'asamblea',
    title: 'Asamblea Ordinaria – Agosto 2026',
    body: 'Se convoca a la Asamblea Ordinaria el jueves 28 de agosto a las 19:00 hs en la sede del CCISJ. Se ruega puntualidad.',
    date: '2026-08-20',
    unread: false,
    popup: true,
  },
  {
    id: '2',
    kind: 'cuota',
    title: 'Actualizacion de cuota mensual',
    body: 'A partir del 1 de septiembre la cuota mensual se actualiza segun lo aprobado en la Asamblea. Consulta el detalle en tu panel.',
    date: '2026-08-18',
    unread: true,
    popup: false,
  },
  {
    id: '3',
    kind: 'bienvenida',
    title: 'Bienvenido/a al portal CCISJ',
    body: 'Gracias por registrarte. Desde este panel podes gestionar tus perfiles, postularte a ofertas y recibir novedades del CCISJ.',
    date: '2026-08-01',
    unread: true,
    popup: false,
  },
  {
    id: '4',
    kind: 'mantenimiento',
    title: 'Mantenimiento programado',
    body: 'El portal estara en mantenimiento el sabado 24/08 de 02:00 a 06:00 hs. Agradecemos la comprension.',
    date: '2026-08-22',
    unread: true,
    popup: false,
  },
]
