import { Building2, ShieldCheck, UserRound } from 'lucide-vue-next'
import type { Role } from '../services/types'

export const roleOptions: Array<{
  role: Role
  title: string
  label: string
  placeholder: string
  description: string
  icon: typeof ShieldCheck
  modifier: string
}> = [
  {
    role: 'ADMIN',
    title: 'Administrador',
    label: 'Email institucional',
    placeholder: 'admin@ccisj.org.uy',
    description: 'Acceso completo al sistema',
    icon: ShieldCheck,
    modifier: 'role-option--admin',
  },
  {
    role: 'SOCIO',
    title: 'Socio',
    label: 'BPS o cédula',
    placeholder: 'Ingresa tu BPS o cédula',
    description: 'Accede con tu BPS o cédula de registro',
    icon: Building2,
    modifier: 'role-option--member',
  },
  {
    role: 'POSTULANTE',
    title: 'Postulante',
    label: 'Gmail / Correo electrónico',
    placeholder: 'usuario@gmail.com',
    description: 'Accede con tu Gmail / correo',
    icon: UserRound,
    modifier: 'role-option--applicant',
  },
]

export function getRoleOption(role: Role) {
  return roleOptions.find((option) => option.role === role) ?? roleOptions[2]
}
