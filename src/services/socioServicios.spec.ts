import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { socioApplicationsService } from './socioApplicationsService'
import { socioBolsaService } from './socioBolsaService'
import { socioDirectorioService } from './socioDirectorioService'
import { socioNotificationService } from './socioNotificationService'
import { socioPerfilService, type SocioPerfilUpdatePayload } from './socioPerfilService'

// Se reemplaza el cliente HTTP para verificar rutas y opciones sin tocar la red.
vi.mock('./http', () => ({ request: vi.fn() }))

describe('servicios del módulo socio', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset()
    vi.mocked(request).mockResolvedValue({ ok: true })
  })

  it('consulta y actualiza las postulaciones recibidas', async () => {
    await expect(socioApplicationsService.list(7)).resolves.toEqual({ ok: true })
    expect(request).toHaveBeenLastCalledWith('/socio/ofertas/7/postulaciones')

    await socioApplicationsService.updateStatus(12, 'REVISADA')
    expect(request).toHaveBeenLastCalledWith('/socio/postulaciones/12/estado?estado=REVISADA', { method: 'PATCH' })

    await socioApplicationsService.downloadCv(12)
    expect(request).toHaveBeenLastCalledWith('/socio/postulaciones/12/cv')
  })

  it('busca perfiles con y sin rubro codificado', async () => {
    await socioBolsaService.searchProfiles()
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa')

    await socioBolsaService.searchProfiles({ rubro: 'Gastronomía & Hotelería' })
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa?rubro=Gastronom%C3%ADa+%26+Hoteler%C3%ADa')

    await socioBolsaService.searchProfiles({ rubro: '', q: '  ' })
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa')
  })

  it('gestiona CVs, postulaciones de contacto y notificaciones al postulante', async () => {
    await socioBolsaService.listProfileCvs(3)
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa/3/cvs')

    await socioBolsaService.downloadCv(3, 9)
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa/3/cvs/9')

    await socioBolsaService.listContactApplications(44)
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa/postulantes/44/postulaciones')

    await socioBolsaService.notifyApplicant(3, true, 15)
    expect(request).toHaveBeenLastCalledWith('/socio/bolsa/3/notificacion', {
      method: 'POST',
      body: JSON.stringify({ selected: true, ofertaId: 15 }),
    })
  })

  it('lista el directorio de socios', async () => {
    await socioDirectorioService.list()
    expect(request).toHaveBeenLastCalledWith('/socio/directorio')

    await socioDirectorioService.list({ q: 'acme', estado: 'MOROSO', page: 3 })
    expect(request).toHaveBeenLastCalledWith('/socio/directorio?q=acme&estado=MOROSO&page=3')
  })

  it('consulta y marca notificaciones del socio', async () => {
    await socioNotificationService.list()
    expect(request).toHaveBeenLastCalledWith('/socio/notificaciones')

    await socioNotificationService.markOneRead('5')
    expect(request).toHaveBeenLastCalledWith('/socio/notificaciones/5/leer', { method: 'POST' })

    await socioNotificationService.markAllRead()
    expect(request).toHaveBeenLastCalledWith('/socio/notificaciones/marcar-leidas', { method: 'POST' })

    await socioNotificationService.dismissPopup()
    expect(request).toHaveBeenLastCalledWith('/socio/notificaciones/descartar-popup', { method: 'POST' })
  })

  it('lee y actualiza el perfil del socio', async () => {
    const payload: SocioPerfilUpdatePayload = {
      razonSocial: 'Empresa', calle: 'Artigas', localidad: 'San José de Mayo', rubroId: 2, telefono: null,
    }
    await socioPerfilService.get()
    expect(request).toHaveBeenLastCalledWith('/socio/perfil')

    await socioPerfilService.update(payload)
    expect(request).toHaveBeenLastCalledWith('/socio/perfil', { method: 'PUT', body: JSON.stringify(payload) })

    await socioPerfilService.updateCorreos(true)
    expect(request).toHaveBeenLastCalledWith('/socio/perfil/correos', {
      method: 'PUT',
      body: JSON.stringify({ silenciarCorreos: true }),
    })

    await socioPerfilService.listRubros()
    expect(request).toHaveBeenLastCalledWith('/socio/perfil/rubros')
  })
})
