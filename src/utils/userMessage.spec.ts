import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '../services/http'
import { userFacingError } from './userMessage'

function api(status: number, detail = 'No fue posible completar la solicitud.') {
  return new ApiRequestError(status, '/test', null, detail)
}

describe('userFacingError', () => {
  it('prioritizes safe backend detail for validation, conflicts and rate limits', () => {
    expect(userFacingError(api(400, 'El BPS no es válido.'), 'guardar')).toBe('El BPS no es válido.')
    expect(userFacingError(api(409, 'Ya existe el socio.'), 'guardar')).toContain('Revisá los datos')
    expect(userFacingError(api(429, 'Esperá 15 minutos.'), 'ingresar')).toBe('Esperá 15 minutos.')
  })

  it('does not expose generic authorization messages and gives actionable guidance', () => {
    expect(userFacingError(api(401, 'Unauthorized'), 'iniciar sesión')).toContain('Usuario o contraseña incorrectos')
    expect(userFacingError(api(403, 'Acceso denegado'), 'eliminar')).toContain('no tenés permiso')
    expect(userFacingError(api(403, 'La clave provisional venció el plazo de 24 horas.'), 'iniciar sesión'))
      .toContain('24 horas')
  })

  it('maps common HTTP failures and preserves useful unknown API detail', () => {
    expect(userFacingError(api(404), 'consultar')).toContain('no encontramos')
    expect(userFacingError(api(422), 'guardar')).toContain('campos obligatorios')
    expect(userFacingError(api(500), 'guardar')).toContain('problema del servidor')
    expect(userFacingError(api(418, 'Respuesta inesperada.'), 'consultar')).toContain('Respuesta inesperada.')
  })

  it('handles network, credential and unknown errors without leaking internals', () => {
    expect(userFacingError(new Error('Failed to fetch'), 'consultar')).toContain('no hay conexión')
    expect(userFacingError(new Error('Credenciales inválidas'), 'login')).toContain('Usuario o contraseña incorrectos')
    expect(userFacingError(new Error('Dato inválido'), 'guardar')).toBe('Dato inválido')
    expect(userFacingError(null, 'guardar')).toContain('contactá al CCISJ')
  })
})
