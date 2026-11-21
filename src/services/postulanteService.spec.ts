import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { postulanteService } from './postulanteService'
import type { PersonalProfile, ProfessionalProfile } from './types'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('applicant profile API service', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('reads and updates job-search availability with optional explicit authentication', async () => {
    await postulanteService.disponibilidadLaboral()
    await postulanteService.disponibilidadLaboral('token-1')
    await postulanteService.updateDisponibilidadLaboral(true, 'token-2')

    expect(request).toHaveBeenNthCalledWith(1, '/postulante/disponibilidad-laboral', {
      headers: undefined,
    })
    expect(request).toHaveBeenNthCalledWith(2, '/postulante/disponibilidad-laboral', {
      headers: { Authorization: 'Bearer token-1' },
    })
    expect(request).toHaveBeenNthCalledWith(3, '/postulante/disponibilidad-laboral', {
      method: 'PUT',
      body: JSON.stringify({ busquedaPausada: true }),
      headers: { Authorization: 'Bearer token-2' },
    })
  })

  it('lists, deletes and downloads applicant CVs', async () => {
    await postulanteService.listCvs('token')
    await postulanteService.deleteCv(17, 'token')
    await postulanteService.downloadCv(17)

    expect(request).toHaveBeenNthCalledWith(1, '/postulante/cvs', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(request).toHaveBeenNthCalledWith(2, '/postulante/cvs/17', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token' },
    })
    expect(request).toHaveBeenNthCalledWith(3, '/postulante/cvs/17/download', {
      headers: undefined,
    })
  })

  it('builds a complete multipart CV upload and normalizes its summary', async () => {
    const file = new File(['curriculum'], 'cv.pdf', { type: 'application/pdf' })

    await postulanteService.uploadCv(file, '  Experiencia comercial  ', 'token', 6, true)

    expect(request).toHaveBeenCalledOnce()
    const [path, options] = vi.mocked(request).mock.calls[0]!
    expect(path).toBe('/postulante/cvs')
    expect(options).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    })
    const body = options?.body as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('perfilLaboralId')).toBe('6')
    expect(body.get('reemplazar')).toBe('true')
    expect(body.get('resumen')).toBe('Experiencia comercial')
  })

  it('omits optional multipart fields when uploading an unassigned CV', async () => {
    const file = new File(['curriculum'], 'cv.pdf')

    await postulanteService.uploadCv(file, '   ')

    const body = vi.mocked(request).mock.calls[0]![1]?.body as FormData
    expect([...body.keys()]).toEqual(['file', 'reemplazar'])
    expect(body.get('reemplazar')).toBe('false')
  })

  it('lists, creates and updates professional profiles', async () => {
    const profile: ProfessionalProfile = {
      id: 11,
      nombre: 'Ventas',
      disponibilidadHoraria: 'PART_TIME',
      tieneVehiculo: true,
      libreta: 'A',
      ultimoEmpleo: 'Comercio',
      descripcionExperiencia: 'Atención al público',
      visible: true,
      rubros: ['Ventas'],
    }
    const { id: _id, ...newProfile } = profile

    await postulanteService.listProfiles('token')
    await postulanteService.createProfile(newProfile, 'token')
    await postulanteService.updateProfile(profile)

    expect(request).toHaveBeenNthCalledWith(1, '/postulante/perfiles', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(request).toHaveBeenNthCalledWith(2, '/postulante/perfiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { Authorization: 'Bearer token' },
    })
    expect(request).toHaveBeenNthCalledWith(3, '/postulante/perfiles/11', {
      method: 'PUT',
      body: JSON.stringify(profile),
      headers: undefined,
    })
  })

  it('reads and updates personal details without sending immutable fields', async () => {
    const update: Omit<PersonalProfile, 'email' | 'fotoUrl'> = {
      nombreCompleto: 'Ana Pérez',
      cedulaIdentidad: '1.234.567-8',
      telefono: '099 111 222',
      zonaResidencia: 'San José',
    }

    await postulanteService.personalProfile('token')
    await postulanteService.updatePersonalProfile(update, 'token')

    expect(request).toHaveBeenNthCalledWith(1, '/postulante/datos-personales', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(request).toHaveBeenNthCalledWith(2, '/postulante/datos-personales', {
      method: 'PUT',
      body: JSON.stringify(update),
      headers: { Authorization: 'Bearer token' },
    })
  })

  it('uploads a profile photo as multipart data', async () => {
    const file = new File(['photo'], 'photo.png', { type: 'image/png' })

    await postulanteService.uploadProfilePhoto(file, 'token')

    const [path, options] = vi.mocked(request).mock.calls[0]!
    expect(path).toBe('/postulante/datos-personales/foto')
    expect(options).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    })
    expect((options?.body as FormData).get('file')).toBe(file)
  })
})
