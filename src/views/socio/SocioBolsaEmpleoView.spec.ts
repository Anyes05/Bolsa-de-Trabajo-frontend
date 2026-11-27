// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SocioBolsaEmpleoView from './SocioBolsaEmpleoView.vue'
import { socioBolsaService, type ContactApplication } from '../../services/socioBolsaService'
import { openCvInNewTab } from '../../utils/openCvInNewTab'
import { ApiRequestError } from '../../services/http'
import type { ApplicantProfileCard } from '../../services/types'
import { applicantPageOf, waitForSearch } from '../../test/pages'

vi.mock('../../services/socioBolsaService', () => ({
  socioBolsaService: {
    searchProfiles: vi.fn(),
    listProfileCvs: vi.fn(),
    downloadCv: vi.fn(),
    listContactApplications: vi.fn(),
    notifyApplicant: vi.fn(),
  },
}))
vi.mock('../../utils/openCvInNewTab', () => ({ openCvInNewTab: vi.fn() }))

const servicio = vi.mocked(socioBolsaService)

function perfil(overrides: Partial<ApplicantProfileCard> = {}): ApplicantProfileCard {
  return {
    id: 1, fotoUrl: null, applicantId: 10, fullName: 'Bruno Díaz', email: 'bruno@example.test',
    phone: '099 111 222', initials: 'BD', profileName: 'Vendedor', categoryLabel: 'Comercio',
    location: 'Libertad', sectors: ['Comercio'], availability: 'FULL_TIME', license: 'Categoría A',
    hasVehicle: true, hasApplication: true, hasCv: true, identityCard: '1.234.567-8', age: 30,
    experienceSummary: '3 años', latestJob: 'Tienda', cvFileName: 'cv.pdf', cvMeta: 'PDF', ...overrides,
  }
}

// Perfil con todos los opcionales vacíos, para cubrir los valores por defecto de la vista.
const perfilIncompleto = perfil({
  id: 2, applicantId: 20, fullName: 'Ana Pérez', email: 'ana@example.test', phone: null, initials: 'AP',
  location: null, license: null, identityCard: null, age: null, experienceSummary: null, latestJob: null,
  cvFileName: null, cvMeta: null, hasApplication: false, hasCv: false, sectors: ['Logística'],
})
const segundoPerfilBruno = perfil({ id: 3, profileName: 'Cajero' })

const ShellStub = defineComponent({
  name: 'SocioShell',
  setup(_, { slots }) {
    return () => h('div', [slots.default?.(), slots.overlay?.()])
  },
})

let wrapper: VueWrapper | null = null

async function montar() {
  wrapper = mount(SocioBolsaEmpleoView, {
    global: {
      stubs: {
        SocioShell: ShellStub,
        ApplicantFilters: true,
        ApplicantGroupCard: true,
        ProfileDetailModal: true,
        ApplicantContactModal: true,
        AppAlert: { template: '<div class="alerta"><slot /></div>' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

const tarjetas = (w: VueWrapper) => w.findAllComponents({ name: 'ApplicantGroupCard' })
const detalle = (w: VueWrapper) => w.findComponent({ name: 'ProfileDetailModal' })
const contacto = (w: VueWrapper) => w.findComponent({ name: 'ApplicantContactModal' })
const alertas = (w: VueWrapper) => w.findAll('.alerta').map((a) => a.text())

// Doble del backend (SocioBolsaController.page): busca, filtra, ordena (recientes = id desc) y agrupa.
function servidor(perfiles: ApplicantProfileCard[]) {
  servicio.searchProfiles.mockImplementation(async ({ q = '', rubro = '', orden = 'RECIENTES' } = {}) => {
    const term = q.trim().toLowerCase()
    const filtrados = perfiles
      .filter((p) => (!term || [p.fullName, p.email, p.phone, p.identityCard, p.profileName].some((v) => (v ?? '').toLowerCase().includes(term)))
        && (!rubro || p.sectors.includes(rubro)))
      .sort((a, b) => orden === 'NOMBRE' ? a.fullName.localeCompare(b.fullName, 'es') : b.id - a.id)
    return applicantPageOf(filtrados, perfiles)
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  servidor([perfil(), perfilIncompleto, segundoPerfilBruno])
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('SocioBolsaEmpleoView', () => {
  it('carga los perfiles y los agrupa por postulante, ordenados por actualización', async () => {
    const w = await montar()
    expect(servicio.searchProfiles).toHaveBeenCalledTimes(1)
    expect(servicio.searchProfiles).toHaveBeenCalledWith({
      q: '', rubro: '', disponibilidad: '', libreta: '', orden: 'RECIENTES', page: 0,
    })
    expect(w.text()).toContain('3 perfiles visibles')
    const grupos = tarjetas(w).map((t) => t.props('applicant'))
    expect(grupos.map((g) => g.fullName)).toEqual(['Bruno Díaz', 'Ana Pérez'])
    expect(grupos[0].profiles.map((p: { profileName: string }) => p.profileName)).toEqual(['Cajero', 'Vendedor'])
    const ana = grupos[1]
    expect(ana.phone).toBe('')
    expect(ana.profiles[0]).toMatchObject({
      location: 'San José', identityCard: '', age: 0, license: 'No informada',
      experienceSummary: '', latestJob: '', cvFileName: '', cvMeta: '', phone: '',
    })
  })

  it('pide al servidor el orden por nombre cuando se elige esa opción', async () => {
    const w = await montar()
    await w.get('select').setValue('name')
    await flushPromises()
    expect(servicio.searchProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ orden: 'NOMBRE', page: 0 }))
    expect(tarjetas(w).map((t) => t.props('applicant').fullName)).toEqual(['Ana Pérez', 'Bruno Díaz'])
  })

  it('envía los filtros de ApplicantFilters al servidor y muestra el mensaje vacío; limpiar restaura la lista', async () => {
    const w = await montar()
    const filtros = w.findComponent({ name: 'ApplicantFilters' })
    expect(filtros.props('sectorOptions')).toEqual(['Comercio', 'Logística'])
    await filtros.vm.$emit('update:search', 'no-existe')
    await waitForSearch()
    expect(servicio.searchProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'no-existe', page: 0 }))
    expect(w.text()).toContain('No hay perfiles que coincidan')
    await filtros.vm.$emit('update:selectedSector', 'Logística')
    await flushPromises()
    expect(servicio.searchProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ rubro: 'Logística' }))
    await filtros.vm.$emit('update:selectedAvailability', 'FULL_TIME')
    await flushPromises()
    expect(servicio.searchProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ rubro: 'Logística', disponibilidad: 'FULL_TIME' }))
    await filtros.vm.$emit('update:selectedLicense', 'yes')
    await flushPromises()
    expect(servicio.searchProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ disponibilidad: 'FULL_TIME', libreta: 'yes' }))
    await filtros.vm.$emit('clear')
    await waitForSearch()
    expect(tarjetas(w)).toHaveLength(2)
  })

  it('muestra el estado de carga y el error si falla la búsqueda', async () => {
    let rechazar!: (e: unknown) => void
    servicio.searchProfiles.mockReturnValue(new Promise((_, reject) => { rechazar = reject }))
    wrapper = mount(SocioBolsaEmpleoView, { global: { stubs: { SocioShell: ShellStub, ApplicantFilters: true, ApplicantGroupCard: true, AppAlert: { template: '<div class="alerta"><slot /></div>' } } } })
    await flushPromises()
    expect(wrapper.text()).toContain('Cargando perfiles...')
    rechazar(new ApiRequestError(500, '/socio/bolsa', null, ''))
    await flushPromises()
    expect(alertas(wrapper)[0]).toContain('problema del servidor')
    expect(wrapper.text()).toContain('No hay perfiles que coincidan')
  })

  it('expande y contrae un grupo de postulante', async () => {
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('toggle')
    expect(tarjetas(w)[0].props('expanded')).toBe(true)
    await tarjetas(w)[0].vm.$emit('toggle')
    expect(tarjetas(w)[0].props('expanded')).toBe(false)
  })

  it('abre un perfil sin postulación sin pedir CVs', async () => {
    const w = await montar()
    const ana = tarjetas(w)[1].props('applicant').profiles[0]
    await tarjetas(w)[1].vm.$emit('view', ana)
    await flushPromises()
    expect(servicio.listProfileCvs).not.toHaveBeenCalled()
    expect(detalle(w).props('profile').fullName).toBe('Ana Pérez')
    expect(detalle(w).props('cvs')).toEqual([])
  })

  it('abre un perfil con postulación, carga sus CVs y permite cerrarlo', async () => {
    const cv = { id: 5, fileName: 'cv.pdf', meta: 'PDF', active: true, uploadedAt: '2026-01-01' }
    servicio.listProfileCvs.mockResolvedValue([cv])
    const w = await montar()
    const vendedor = tarjetas(w)[0].props('applicant').profiles[1]
    await tarjetas(w)[0].vm.$emit('view', vendedor)
    expect(detalle(w).props('loadingCvs')).toBe(true)
    await flushPromises()
    expect(servicio.listProfileCvs).toHaveBeenCalledWith(1)
    expect(detalle(w).props('cvs')).toEqual([cv])
    expect(detalle(w).props('loadingCvs')).toBe(false)
    await detalle(w).vm.$emit('close')
    expect(detalle(w).exists()).toBe(false)
  })

  it('informa el error si fallan los CVs del perfil', async () => {
    servicio.listProfileCvs.mockRejectedValue(new ApiRequestError(403, '/x', null, 'Sin postulación'))
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('view', tarjetas(w)[0].props('applicant').profiles[0])
    await flushPromises()
    expect(alertas(w)).toContain('Sin postulación')
  })

  it('descarga el CV en una pestaña nueva, ignora pedidos sin id y muestra errores', async () => {
    servicio.listProfileCvs.mockResolvedValue([])
    vi.mocked(openCvInNewTab).mockImplementation(async (getDownload) => { await getDownload() })
    servicio.downloadCv.mockResolvedValue({ url: 'https://s3/cv.pdf' })
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('view', tarjetas(w)[0].props('applicant').profiles[0])
    await flushPromises()
    await detalle(w).vm.$emit('download-cv', '3')
    await flushPromises()
    expect(openCvInNewTab).not.toHaveBeenCalled()
    await detalle(w).vm.$emit('download-cv', '3', 9)
    await flushPromises()
    expect(servicio.downloadCv).toHaveBeenCalledWith(3, 9)
    vi.mocked(openCvInNewTab).mockRejectedValue(new Error('El navegador bloqueó la pestaña de descarga.'))
    await detalle(w).vm.$emit('download-cv', '3', 9)
    await flushPromises()
    expect(alertas(w)).toContain('El navegador bloqueó la pestaña de descarga.')
  })

  it('abre el contacto, carga las postulaciones y notifica al postulante', async () => {
    const postulacion: ContactApplication = { ofertaId: 4, ofertaTitulo: 'Vendedor', perfilId: 1, perfilNombre: 'Vendedor' }
    servicio.listContactApplications.mockResolvedValue([postulacion])
    servicio.notifyApplicant.mockResolvedValue({ message: 'Notificación enviada' })
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('contact')
    expect(contacto(w).props('loadingApplications')).toBe(true)
    await flushPromises()
    expect(servicio.listContactApplications).toHaveBeenCalledWith(10)
    expect(contacto(w).props()).toMatchObject({ applicantName: 'Bruno Díaz', applications: [postulacion], loadingApplications: false })
    await contacto(w).vm.$emit('notify', true, postulacion)
    await flushPromises()
    expect(servicio.notifyApplicant).toHaveBeenCalledWith(1, true, 4)
    expect(contacto(w).exists()).toBe(false)
    expect(alertas(w)).toContain('Notificación enviada')
  })

  it('muestra el error de notificación y evita envíos dobles', async () => {
    const postulacion: ContactApplication = { ofertaId: 4, ofertaTitulo: 'X', perfilId: 1, perfilNombre: 'Y' }
    servicio.listContactApplications.mockResolvedValue([postulacion])
    let rechazar!: (e: unknown) => void
    servicio.notifyApplicant.mockReturnValue(new Promise((_, reject) => { rechazar = reject }))
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('contact')
    await flushPromises()
    await contacto(w).vm.$emit('notify', false, postulacion)
    expect(contacto(w).props('loading')).toBe(true)
    await contacto(w).vm.$emit('notify', false, postulacion)
    expect(servicio.notifyApplicant).toHaveBeenCalledTimes(1)
    rechazar(new ApiRequestError(409, '/x', null, 'Ya notificado.'))
    await flushPromises()
    expect(contacto(w).props('error')).toBe('Ya notificado. Revisá los datos e intentá nuevamente.')
    await contacto(w).vm.$emit('close')
    expect(contacto(w).exists()).toBe(false)
  })

  it('muestra el error al cargar postulaciones del contacto', async () => {
    servicio.listContactApplications.mockRejectedValue(new ApiRequestError(500, '/x', null, ''))
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('contact')
    await flushPromises()
    expect(contacto(w).props('error')).toContain('problema del servidor')
    expect(contacto(w).props('loadingApplications')).toBe(false)
  })

  it('descarta respuestas de un contacto anterior si se cambió de postulante', async () => {
    const pendientes: Array<{ resolve: (v: ContactApplication[]) => void, reject: (e: unknown) => void }> = []
    servicio.listContactApplications.mockImplementation(() => new Promise((resolve, reject) => { pendientes.push({ resolve, reject }) }))
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('contact')
    await tarjetas(w)[1].vm.$emit('contact')
    pendientes[0].resolve([{ ofertaId: 1, ofertaTitulo: 'Vieja', perfilId: 1, perfilNombre: 'Vieja' }])
    pendientes[0].reject(new Error('ignorado'))
    await flushPromises()
    expect(contacto(w).props('applicantName')).toBe('Ana Pérez')
    expect(contacto(w).props('applications')).toEqual([])
    expect(contacto(w).props('loadingApplications')).toBe(true)
    pendientes[1].resolve([])
    await flushPromises()
    expect(contacto(w).props('loadingApplications')).toBe(false)
  })

  it('ignora una notificación sin postulante seleccionado', async () => {
    servicio.listContactApplications.mockResolvedValue([])
    const w = await montar()
    await tarjetas(w)[0].vm.$emit('contact')
    await flushPromises()
    const modal = contacto(w)
    await modal.vm.$emit('close')
    await modal.vm.$emit('notify', true, { ofertaId: 1, ofertaTitulo: '', perfilId: 1, perfilNombre: '' })
    expect(servicio.notifyApplicant).not.toHaveBeenCalled()
  })

describe('bolsa de empleo del socio: contacto con respuestas tardías', () => {
  it('un error de un postulante anterior no se muestra en el contacto del actual', async () => {
    servidor([])
    const vista = await montar()
    let rechazar!: (cause: unknown) => void
    vi.mocked(socioBolsaService.listContactApplications)
      .mockReturnValueOnce(new Promise((_, fail) => { rechazar = fail }))
      .mockResolvedValueOnce([])
    const vm = vista.vm as unknown as { openContact: (applicant: unknown) => Promise<void>; contactError: string | null }
    const primero = vm.openContact({ id: 1, profiles: [] })
    await vm.openContact({ id: 2, profiles: [] })
    rechazar(new Error('offline'))
    await primero
    expect(vm.contactError).toBeNull()
  })
})
})
