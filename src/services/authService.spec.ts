import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from './authService'
import { request } from './http'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('servicio de autenticación', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset()
    vi.mocked(request).mockResolvedValue('respuesta')
  })

  const credential = { credential: 'jwt-google', nonce: 'n-1' }

  it.each([
    ['googleAuthenticate', () => authService.googleAuthenticate(credential), '/auth/google',
      { method: 'POST', body: JSON.stringify(credential) }],
    ['googleLink', () => authService.googleLink(credential, 'Clave#123'), '/auth/google/link',
      { method: 'POST', body: JSON.stringify({ ...credential, password: 'Clave#123' }) }],
    ['login', () => authService.login('SOCIO', '12345678', 'Clave#123'), '/auth/login',
      { method: 'POST', body: JSON.stringify({ role: 'SOCIO', identifier: '12345678', password: 'Clave#123' }) }],
    ['logout', () => authService.logout(), '/auth/logout', { method: 'POST' }],
    ['removeProfilePhoto', () => authService.removeProfilePhoto(), '/auth/me/foto', { method: 'DELETE' }],
    ['changePassword', () => authService.changePassword({ currentPassword: 'a', newPassword: 'b' }),
      '/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: 'a', newPassword: 'b' }) }],
    ['registrationAvailability', () => authService.registrationAvailability('a@b.uy', '1234'),
      '/auth/register/availability', { method: 'POST', body: JSON.stringify({ email: 'a@b.uy', identityCard: '1234' }) }],
  ] as const)('%s llama al endpoint correcto con el cuerpo esperado', async (_, call, path, options) => {
    await expect(call()).resolves.toBe('respuesta')
    expect(request).toHaveBeenCalledWith(path, options)
  })

  it('consulta el usuario actual con un GET simple', async () => {
    await authService.currentUser()
    expect(request).toHaveBeenCalledWith('/auth/me')
  })

  it('registra postulantes y registros de Google enviando el payload como JSON', async () => {
    const payload = { fullName: 'Ana', sectors: ['Ventas'] } as never
    await authService.registerApplicant(payload)
    expect(request).toHaveBeenLastCalledWith('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
    await authService.googleRegister(payload)
    expect(request).toHaveBeenLastCalledWith('/auth/google/register', { method: 'POST', body: JSON.stringify(payload) })
  })

  it('sube la foto de perfil como FormData con el campo file', async () => {
    const file = new File(['img'], 'foto.png', { type: 'image/png' })
    await authService.uploadProfilePhoto(file)
    const [path, options] = vi.mocked(request).mock.calls[0]
    expect(path).toBe('/auth/me/foto')
    expect(options?.method).toBe('POST')
    const enviado = (options?.body as FormData).get('file') as File
    expect(enviado).toBeInstanceOf(File)
    expect(enviado.name).toBe('foto.png')
  })
})
