import { describe, expect, it } from 'vitest'
import { getRoleOption, roleOptions } from './roles'

describe('opciones de rol para el acceso', () => {
  it('define una opción por cada rol con su modificador visual', () => {
    expect(roleOptions.map((option) => option.role)).toEqual(['ADMIN', 'SOCIO', 'POSTULANTE'])
    expect(roleOptions.map((option) => option.modifier)).toEqual([
      'role-option--admin', 'role-option--member', 'role-option--applicant',
    ])
  })

  it('devuelve la opción del rol pedido', () => {
    expect(getRoleOption('ADMIN').title).toBe('Administrador')
    expect(getRoleOption('SOCIO').label).toBe('BPS o cédula')
  })

  it('usa la opción de postulante cuando el rol no existe', () => {
    expect(getRoleOption('OTRO' as never).role).toBe('POSTULANTE')
  })
})
