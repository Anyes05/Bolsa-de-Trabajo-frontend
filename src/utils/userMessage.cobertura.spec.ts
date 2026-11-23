import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '../services/http'
import { userFacingError } from './userMessage'

const api = (status: number, detail = '') => new ApiRequestError(status, '/x', null, detail)
const GENERICO = 'No fue posible completar la solicitud.'

describe('userFacingError: casos de iniciar sesión', () => {
  const accion = 'iniciar sesión'

  it('429 usa el detalle útil o un mensaje de demasiados intentos', () => {
    expect(userFacingError(api(429, 'Bloqueado 15 minutos'), accion)).toBe('Bloqueado 15 minutos')
    expect(userFacingError(api(429, GENERICO), accion)).toContain('demasiados intentos')
  })

  it('401 informa credenciales incorrectas', () => {
    expect(userFacingError(api(401, 'Unauthorized'), accion)).toContain('Usuario o contraseña incorrectos')
  })

  it('403 prioriza el aviso de plazo de clave provisional y otros detalles útiles', () => {
    expect(userFacingError(api(403, 'Tu clave provisional venció'), accion)).toBe('Tu clave provisional venció')
    expect(userFacingError(api(403, 'Usuario inactivo'), accion)).toBe('Usuario inactivo')
    expect(userFacingError(api(403, 'Acceso denegado'), accion)).toContain('clave provisional venció (24 h)')
  })

  it('otros estados usan el detalle útil o un mensaje genérico de inicio de sesión', () => {
    expect(userFacingError(api(400, 'Correo inválido'), accion)).toBe('Correo inválido')
    expect(userFacingError(api(500, ''), accion)).toBe('No se pudo iniciar sesión. Intentá nuevamente en unos momentos.')
  })

  it('un Error con "credenciales" se traduce a credenciales incorrectas', () => {
    expect(userFacingError(new Error('Credenciales inválidas'), 'ingresar')).toContain('Usuario o contraseña incorrectos')
  })
})

describe('userFacingError: otras acciones', () => {
  const accion = 'guardar el socio'

  it('401 indica sesión vencida', () => {
    expect(userFacingError(api(401), accion)).toBe(`No se pudo ${accion}: tu sesión ya no es válida. Volvé a iniciar sesión e intentá nuevamente.`)
  })

  it('403 distingue plazo de clave, detalle útil y permiso genérico', () => {
    expect(userFacingError(api(403, 'Plazo de 24 horas vencido'), accion)).toBe('Plazo de 24 horas vencido')
    expect(userFacingError(api(403, 'Solo directivos'), accion)).toBe('Solo directivos')
    expect(userFacingError(api(403, ''), accion)).toContain('no tenés permiso')
  })

  it('404, 409, 400/422 y 5xx tienen mensajes propios', () => {
    expect(userFacingError(api(404), accion)).toContain('no encontramos el recurso')
    expect(userFacingError(api(409, 'RUT duplicado.'), accion)).toBe('RUT duplicado. Revisá los datos e intentá nuevamente.')
    expect(userFacingError(api(409), accion)).toContain('ya existe un registro')
    expect(userFacingError(api(422, 'Fecha inválida'), accion)).toBe('Fecha inválida')
    expect(userFacingError(api(400), accion)).toContain('campos obligatorios')
    expect(userFacingError(api(503, 'caído'), accion)).toContain('problema del servidor')
  })

  it('otros estados agregan el detalle útil o caen al mensaje final', () => {
    expect(userFacingError(api(418, 'Detalle raro'), accion)).toBe(`No se pudo ${accion}. Detalle raro`)
    expect(userFacingError(api(418, ''), accion)).toBe(`No se pudo ${accion}. Intentá nuevamente; si el problema continúa, contactá al CCISJ.`)
  })

  it('errores de red, errores comunes y valores desconocidos', () => {
    expect(userFacingError(new TypeError('Failed to fetch'), accion)).toContain('no hay conexión con el servidor')
    expect(userFacingError(new Error('  Algo falló  '), accion)).toBe('Algo falló')
    expect(userFacingError(new Error('   '), accion)).toContain('contactá al CCISJ')
    expect(userFacingError('texto', accion)).toContain('contactá al CCISJ')
  })
})
