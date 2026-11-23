// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, type PropType } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AdminApplicantsView from './AdminApplicantsView.vue'
import { adminApplicantService } from '../../services/adminApplicantService'
import { openCvInNewTab } from '../../utils/openCvInNewTab'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import type { AdminApplicantProfile, SocioProfileCv } from '../../services/types'

vi.mock('../../services/adminApplicantService', () => ({
  adminApplicantService: { list: vi.fn(), listProfileCvs: vi.fn(), downloadCv: vi.fn() },
}))
vi.mock('../../utils/openCvInNewTab', () => ({ openCvInNewTab: vi.fn() }))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active, 'data-subtitle': props.subtitle }, slots.default?.())
  },
})

type GrupoPostulante = {
  id: number
  fullName: string
  email: string
  phone: string
  initials: string
  profiles: MockApplicantProfile[]
  estado: 'ACTIVO' | 'INACTIVO'
  estadoDetalle: string
  busquedaPausada: boolean
}

// Tarjeta mínima: expone el grupo recibido y emite los eventos que usa la vista.
const ApplicantGroupCardStub = defineComponent({
  name: 'ApplicantGroupCard',
  props: {
    applicant: { type: Object as PropType<GrupoPostulante>, required: true },
    expanded: Boolean,
    showContact: Boolean,
    showEstado: Boolean,
  },
  emits: ['toggle', 'view'],
  setup(props, { emit }) {
    return () => h('article', { class: 'grupo', 'data-expanded': String(props.expanded) }, [
      h('h3', props.applicant.fullName),
      h('button', { class: 'grupo-toggle', onClick: () => emit('toggle') }, 'Ver perfiles'),
      ...props.applicant.profiles.map((profile) =>
        h('button', { class: 'grupo-ver', onClick: () => emit('view', profile) }, profile.profileName)),
    ])
  },
})

const ProfileDetailModalStub = defineComponent({
  name: 'ProfileDetailModal',
  props: {
    profile: { type: Object as PropType<MockApplicantProfile>, required: true },
    cvs: { type: Array as PropType<SocioProfileCv[]>, default: () => [] },
    loadingCvs: Boolean,
  },
  emits: ['close', 'downloadCv'],
  setup(props, { emit }) {
    return () => h('div', { class: 'detalle' }, [
      h('button', { class: 'detalle-cerrar', onClick: () => emit('close') }, 'Cerrar'),
      h('button', { class: 'detalle-cv', onClick: () => emit('downloadCv', props.profile.id, props.cvs[0]?.id) }, 'CV'),
      h('button', { class: 'detalle-sin-cv', onClick: () => emit('downloadCv', props.profile.id) }, 'Sin CV'),
    ])
  },
})

function perfil(id: number, overrides: Partial<AdminApplicantProfile> = {}): AdminApplicantProfile {
  return {
    id,
    fotoUrl: null,
    applicantId: 1,
    fullName: 'Ana Pérez',
    email: 'ana@test.uy',
    phone: '099 111 222',
    initials: 'AP',
    profileName: `Perfil ${id}`,
    categoryLabel: 'Ventas',
    location: 'Libertad',
    sectors: ['Ventas'],
    availability: 'FULL_TIME',
    license: 'Categoría A',
    hasVehicle: false,
    hasCv: true,
    identityCard: '1.234.567-8',
    age: 30,
    experienceSummary: 'Experiencia',
    latestJob: 'Vendedora',
    cvFileName: 'cv.pdf',
    cvMeta: 'PDF',
    busquedaPausada: false,
    cuentaActiva: true,
    visibleEnBolsa: true,
    perfilVisible: true,
    estado: 'ACTIVO',
    ...overrides,
  }
}

function cv(id: number): SocioProfileCv {
  return { id, fileName: `cv-${id}.pdf`, meta: 'PDF', active: true, uploadedAt: '2026-11-01' }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

function montar() {
  return mount(AdminApplicantsView, {
    global: {
      stubs: {
        AdminShell: AdminShellStub,
        ApplicantGroupCard: ApplicantGroupCardStub,
        ProfileDetailModal: ProfileDetailModalStub,
      },
    },
  })
}

function grupos(wrapper: ReturnType<typeof montar>) {
  return wrapper.findAllComponents(ApplicantGroupCardStub).map((tarjeta) => tarjeta.props('applicant') as GrupoPostulante)
}

describe('postulantes registrados (administración)', () => {
  beforeEach(() => {
    vi.mocked(adminApplicantService.list).mockReset()
    vi.mocked(adminApplicantService.listProfileCvs).mockReset()
    vi.mocked(adminApplicantService.downloadCv).mockReset()
    vi.mocked(openCvInNewTab).mockReset()
  })

  it('muestra la carga y agrupa los perfiles por postulante con su estado', async () => {
    const lista = deferred<AdminApplicantProfile[]>()
    vi.mocked(adminApplicantService.list).mockReturnValueOnce(lista.promise)
    const wrapper = montar()
    await nextTick()
    expect(wrapper.text()).toContain('Cargando postulantes...')
    expect(wrapper.findAll('select').every((select) => select.attributes('disabled') !== undefined)).toBe(true)

    lista.resolve([
      perfil(1, { applicantId: 1 }),
      perfil(2, { applicantId: 1, profileName: 'Cajera' }),
      perfil(3, {
        applicantId: 2, fullName: 'Bruno Silva', email: 'bruno@test.uy', phone: null, initials: 'BS',
        estado: 'INACTIVO', cuentaActiva: false, location: null, identityCard: null, age: null, license: null,
        experienceSummary: null, latestJob: null, cvFileName: null, cvMeta: null,
      }),
    ])
    await flushPromises()

    const shell = wrapper.find('[data-active]')
    expect(shell.attributes('data-active')).toBe('postulantes')
    expect(shell.attributes('data-subtitle')).toBe('1 activos · 1 inactivos · 3 perfiles')
    const [ana, bruno] = grupos(wrapper)
    expect(ana!.fullName).toBe('Ana Pérez')
    expect(ana!.profiles.map((item) => item.profileName)).toEqual(['Perfil 1', 'Cajera'])
    expect(ana!.estado).toBe('ACTIVO')
    expect(ana!.estadoDetalle).toBe('Visible en la bolsa de empleo')
    expect(ana!.profiles[0]).toMatchObject({ id: '1', location: 'Libertad', license: 'Categoría A', updatedAt: '000000000001' })
    expect(bruno!.estado).toBe('INACTIVO')
    expect(bruno!.phone).toBe('')
    expect(bruno!.estadoDetalle).toBe('Cuenta de usuario desactivada')
    expect(bruno!.profiles[0]).toMatchObject({
      phone: '', location: 'San José', identityCard: '', age: 0, license: 'No informada',
      experienceSummary: '', latestJob: '', cvFileName: '', cvMeta: '',
    })
    expect(wrapper.text()).toContain('Activos (1)')
    expect(wrapper.text()).toContain('Inactivos (1)')
  })

  it.each([
    [{ busquedaPausada: true }, 'Búsqueda pausada: no busca trabajo actualmente', true],
    [{ visibleEnBolsa: false }, 'Oculto en la bolsa (retención / no confirmó permanencia)', false],
    [{ perfilVisible: false }, 'Activo en bolsa; este perfil laboral está oculto por el postulante', false],
  ] as const)('describe el estado de visibilidad %o', async (overrides, detalle, pausada) => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(1, overrides)])
    const wrapper = montar()
    await flushPromises()

    expect(grupos(wrapper)[0]).toMatchObject({ estadoDetalle: detalle, busquedaPausada: pausada })
  })

  it('una cuenta desactivada no se marca como búsqueda pausada', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([
      perfil(1, { cuentaActiva: false, busquedaPausada: true, estado: 'INACTIVO' }),
    ])
    const wrapper = montar()
    await flushPromises()

    expect(grupos(wrapper)[0]).toMatchObject({ estadoDetalle: 'Cuenta de usuario desactivada', busquedaPausada: false })
  })

  it('filtra por estado en la bolsa', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([
      perfil(1, { applicantId: 1 }),
      perfil(2, { applicantId: 2, fullName: 'Bruno Silva', estado: 'INACTIVO' }),
    ])
    const wrapper = montar()
    await flushPromises()
    const chips = wrapper.findAll('.admin-applicants__chip')

    await chips[1]!.trigger('click')
    expect(chips[1]!.classes()).toContain('admin-applicants__chip--active')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Ana Pérez'])
    await chips[2]!.trigger('click')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Bruno Silva'])
    await chips[0]!.trigger('click')
    expect(grupos(wrapper)).toHaveLength(2)
  })

  it('usa los filtros de búsqueda y permite limpiarlos', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([
      perfil(1, { applicantId: 1, sectors: ['Ventas'], availability: 'FULL_TIME' }),
      perfil(2, { applicantId: 2, fullName: 'Bruno Silva', sectors: ['Logística'], availability: 'PART_TIME', license: 'No tiene' }),
    ])
    const wrapper = montar()
    await flushPromises()
    const limpiar = wrapper.find('.admin-applicant-clear')
    expect(limpiar.attributes('disabled')).toBeDefined()

    const [rubro, disponibilidad, libreta] = wrapper.findAll('select')
    expect(rubro!.findAll('option').map((opcion) => opcion.text())).toEqual(['Todos los rubros', 'Logística', 'Ventas'])
    expect(disponibilidad!.findAll('option').map((opcion) => opcion.text())).toEqual(['Todas las disponibilidades', 'FULL_TIME', 'PART_TIME'])

    await wrapper.find('input[aria-label^="Buscar"]').setValue('bruno')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Bruno Silva'])
    expect(limpiar.attributes('disabled')).toBeUndefined()

    await limpiar.trigger('click')
    expect((wrapper.find('input[aria-label^="Buscar"]').element as HTMLInputElement).value).toBe('')
    expect(grupos(wrapper)).toHaveLength(2)

    await rubro!.setValue('Ventas')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Ana Pérez'])
    await rubro!.setValue('')
    await disponibilidad!.setValue('PART_TIME')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Bruno Silva'])
    await disponibilidad!.setValue('')
    await libreta!.setValue('yes')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Ana Pérez'])

    await wrapper.find('input[aria-label^="Buscar"]').setValue('inexistente')
    expect(wrapper.text()).toContain('No hay postulantes que coincidan con la búsqueda y los filtros.')
  })

  it('busca por cédula aunque el postulante no tenga teléfono', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([
      perfil(1, { applicantId: 1, phone: null }),
      perfil(2, { applicantId: 2, fullName: 'Bruno Silva', identityCard: '9.999.999-9' }),
    ])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('input[aria-label^="Buscar"]').setValue('1.234')
    expect(grupos(wrapper).map((grupo) => grupo.fullName)).toEqual(['Ana Pérez'])
    expect(grupos(wrapper)[0]!.phone).toBe('')
  })

  it('muestra el error si no se pueden cargar los postulantes', async () => {
    vi.mocked(adminApplicantService.list).mockRejectedValueOnce(new Error('Sin conexión a la base'))
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Sin conexión a la base')
    expect(wrapper.text()).toContain('No hay postulantes que coincidan')
  })

  it('expande y contrae el grupo de un postulante', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(1)])
    const wrapper = montar()
    await flushPromises()
    const tarjeta = () => wrapper.findComponent(ApplicantGroupCardStub)

    expect(tarjeta().props('expanded')).toBe(false)
    expect(tarjeta().props('showContact')).toBe(false)
    expect(tarjeta().props('showEstado')).toBe(true)
    await wrapper.find('.grupo-toggle').trigger('click')
    expect(tarjeta().props('expanded')).toBe(true)
    await wrapper.find('.grupo-toggle').trigger('click')
    expect(tarjeta().props('expanded')).toBe(false)
  })

  it('abre el detalle de un perfil cargando sus CVs y lo cierra', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(8)])
    const cvs = deferred<SocioProfileCv[]>()
    vi.mocked(adminApplicantService.listProfileCvs).mockReturnValueOnce(cvs.promise)
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.grupo-ver').trigger('click')
    const modal = () => wrapper.findComponent(ProfileDetailModalStub)
    expect(adminApplicantService.listProfileCvs).toHaveBeenCalledWith(8)
    expect(modal().props('profile')).toMatchObject({ id: '8', profileName: 'Perfil 8' })
    expect(modal().props('loadingCvs')).toBe(true)
    expect(modal().props('cvs')).toEqual([])

    cvs.resolve([cv(31)])
    await flushPromises()
    expect(modal().props('loadingCvs')).toBe(false)
    expect(modal().props('cvs')).toEqual([cv(31)])

    await wrapper.find('.detalle-cerrar').trigger('click')
    expect(wrapper.findComponent(ProfileDetailModalStub).exists()).toBe(false)
  })

  it('muestra el error si fallan los CVs del perfil', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(8)])
    vi.mocked(adminApplicantService.listProfileCvs).mockRejectedValueOnce(new Error('CVs no disponibles'))
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.grupo-ver').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('CVs no disponibles')
    expect(wrapper.findComponent(ProfileDetailModalStub).props('loadingCvs')).toBe(false)
  })

  it('descarga un CV abriéndolo en una pestaña nueva', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(8)])
    vi.mocked(adminApplicantService.listProfileCvs).mockResolvedValueOnce([cv(31)])
    vi.mocked(adminApplicantService.downloadCv).mockResolvedValueOnce({ url: 'https://cdn.test/cv.pdf' })
    vi.mocked(openCvInNewTab).mockImplementationOnce(async (obtener) => { await obtener() })
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.grupo-ver').trigger('click')
    await flushPromises()
    await wrapper.find('.detalle-cv').trigger('click')
    await flushPromises()

    expect(openCvInNewTab).toHaveBeenCalledTimes(1)
    expect(adminApplicantService.downloadCv).toHaveBeenCalledWith(8, 31)
  })

  it('ignora la descarga cuando no hay CV seleccionado', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(8)])
    vi.mocked(adminApplicantService.listProfileCvs).mockResolvedValueOnce([])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.grupo-ver').trigger('click')
    await flushPromises()
    await wrapper.find('.detalle-sin-cv').trigger('click')
    await flushPromises()

    expect(openCvInNewTab).not.toHaveBeenCalled()
  })

  it('muestra el error si la descarga del CV falla', async () => {
    vi.mocked(adminApplicantService.list).mockResolvedValueOnce([perfil(8)])
    vi.mocked(adminApplicantService.listProfileCvs).mockResolvedValueOnce([cv(31)])
    vi.mocked(openCvInNewTab).mockRejectedValueOnce(new Error('El navegador bloqueó la pestaña de descarga.'))
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.grupo-ver').trigger('click')
    await flushPromises()
    await wrapper.find('.detalle-cv').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('El navegador bloqueó la pestaña de descarga.')
  })
})
