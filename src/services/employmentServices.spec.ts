import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { adminApplicantService } from './adminApplicantService'
import { applicantOfferService } from './applicantOfferService'
import { offerService } from './offerService'
import { socioApplicationsService } from './socioApplicationsService'
import { socioBolsaService } from './socioBolsaService'
import type { JobOfferPayload } from './types'

vi.mock('./http', () => ({ request: vi.fn() }))

describe('employment marketplace API services', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('loads admin applicants and their CV resources', async () => {
    await adminApplicantService.list()
    await adminApplicantService.listProfileCvs(12)
    await adminApplicantService.downloadCv(12, 34)

    expect(request).toHaveBeenNthCalledWith(1, '/admin/postulantes')
    expect(request).toHaveBeenNthCalledWith(2, '/admin/postulantes/12/cvs')
    expect(request).toHaveBeenNthCalledWith(3, '/admin/postulantes/12/cvs/34')
  })

  it('lists applicant offers with optional rubro filtering', async () => {
    await applicantOfferService.list()
    await applicantOfferService.list(7)
    await applicantOfferService.listRubros()
    await applicantOfferService.listApplications()

    expect(request).toHaveBeenNthCalledWith(1, '/postulante/ofertas')
    expect(request).toHaveBeenNthCalledWith(2, '/postulante/ofertas?rubroId=7')
    expect(request).toHaveBeenNthCalledWith(3, '/postulante/ofertas/rubros')
    expect(request).toHaveBeenNthCalledWith(4, '/postulante/ofertas/postulaciones')
  })

  it('submits an application with its selected professional profile', async () => {
    await applicantOfferService.apply(9, 4)

    expect(request).toHaveBeenCalledWith('/postulante/ofertas/9/postulaciones', {
      method: 'POST',
      body: JSON.stringify({ perfilId: 4 }),
    })
  })

  it('loads offer administration catalogs', async () => {
    await offerService.list()
    await offerService.listActiveSocios()
    await offerService.listRubros()

    expect(request).toHaveBeenNthCalledWith(1, '/ofertas')
    expect(request).toHaveBeenNthCalledWith(2, '/ofertas/socios-activos')
    expect(request).toHaveBeenNthCalledWith(3, '/ofertas/rubros')
  })

  it('creates, edits and changes offer status with the expected HTTP contracts', async () => {
    const payload = {
      mostrarNombreEmpresa: true,
      rubroId: 3,
      titulo: 'Auxiliar',
      cargo: null,
      descripcion: 'Descripción',
      requisitos: null,
      zona: null,
      salario: null,
      tipoContrato: 'EFECTIVO',
      disponibilidadHoraria: 'FULL_TIME',
      vacantes: 2,
      fechaCierre: null,
    } satisfies JobOfferPayload

    await offerService.create(payload)
    await offerService.update(15, payload)
    await offerService.setStatus(15, 'PAUSADA')

    expect(request).toHaveBeenNthCalledWith(1, '/ofertas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    expect(request).toHaveBeenNthCalledWith(2, '/ofertas/15', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    expect(request).toHaveBeenNthCalledWith(3, '/ofertas/15/estado?estado=PAUSADA', {
      method: 'PATCH',
    })
  })

  it('searches the socio job board and encodes rubro names safely', async () => {
    await socioBolsaService.searchProfiles()
    await socioBolsaService.searchProfiles('Atención al público & ventas')

    expect(request).toHaveBeenNthCalledWith(1, '/socio/bolsa')
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/socio/bolsa?rubro=Atenci%C3%B3n%20al%20p%C3%BAblico%20%26%20ventas',
    )
  })

  it('accesses socio CVs, contact context and selection notifications', async () => {
    await socioBolsaService.listProfileCvs(5)
    await socioBolsaService.downloadCv(5, 8)
    await socioBolsaService.listContactApplications(13)
    await socioBolsaService.notifyApplicant(5, true, 21)

    expect(request).toHaveBeenNthCalledWith(1, '/socio/bolsa/5/cvs')
    expect(request).toHaveBeenNthCalledWith(2, '/socio/bolsa/5/cvs/8')
    expect(request).toHaveBeenNthCalledWith(3, '/socio/bolsa/postulantes/13/postulaciones')
    expect(request).toHaveBeenNthCalledWith(4, '/socio/bolsa/5/notificacion', {
      method: 'POST',
      body: JSON.stringify({ selected: true, ofertaId: 21 }),
    })
  })

  it('lists and updates received applications and downloads their CVs', async () => {
    await socioApplicationsService.list(22)
    await socioApplicationsService.updateStatus(41, 'CONTACTADA')
    await socioApplicationsService.downloadCv(41)

    expect(request).toHaveBeenNthCalledWith(1, '/socio/ofertas/22/postulaciones')
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/socio/postulaciones/41/estado?estado=CONTACTADA',
      { method: 'PATCH' },
    )
    expect(request).toHaveBeenNthCalledWith(3, '/socio/postulaciones/41/cv')
  })

  it('returns request results and propagates backend failures unchanged', async () => {
    const offers = [{ id: 1 }]
    vi.mocked(request).mockResolvedValueOnce(offers)
    await expect(offerService.list()).resolves.toBe(offers)

    const failure = new Error('service unavailable')
    vi.mocked(request).mockRejectedValueOnce(failure)
    await expect(applicantOfferService.listApplications()).rejects.toBe(failure)
  })
})
