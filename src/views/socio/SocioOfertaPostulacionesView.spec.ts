// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import SocioOfertaPostulacionesView from './SocioOfertaPostulacionesView.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import { ApiRequestError } from '../../services/http'
import { offerService } from '../../services/offerService'
import { socioApplicationsService } from '../../services/socioApplicationsService'
import type { JobOffer, ReceivedApplication } from '../../services/types'
import { openCvInNewTab } from '../../utils/openCvInNewTab'

vi.mock('../../services/offerService', () => ({ offerService: { get: vi.fn() } }))
vi.mock('../../services/socioApplicationsService', () => ({
  socioApplicationsService: { list: vi.fn(), updateStatus: vi.fn(), downloadCv: vi.fn() },
}))
vi.mock('../../utils/openCvInNewTab', () => ({ openCvInNewTab: vi.fn() }))

// El layout real se reemplaza por un contenedor que expone título y subtítulo.
const SocioShellStub = defineComponent({
  props: { title: String, subtitle: String, activeNav: String },
  setup(props, { slots }) {
    return () => h('div', { class: 'shell', 'data-title': props.title, 'data-subtitle': props.subtitle, 'data-active': props.activeNav }, [
      h('div', { class: 'acciones' }, slots['header-actions']?.()), slots.default?.(), slots.overlay?.(),
    ])
  },
})

const Vacia = defineComponent({ render: () => h('div') })

function oferta(id: number): JobOffer {
  return {
    id, mostrarNombreEmpresa: true, socioId: 1, socioNombre: 'Mi empresa', rubroId: 1, rubro: 'Ventas',
    titulo: `Vendedor ${id}`, cargo: null, descripcion: 'Desc', requisitos: null, zona: null, salario: null,
    tipoContrato: null, disponibilidadHoraria: 'FULL_TIME', vacantes: 1, fechaPublicacion: '2026-01-01',
    fechaCierre: null, estado: 'ACTIVA', postulaciones: 2,
  }
}

function postulacion(id: number, cambios: Partial<ReceivedApplication> = {}): ReceivedApplication {
  return {
    id, fullName: `Postulante ${id}`, initials: 'PP', profileId: id * 10, profileName: 'Vendedor', location: 'Libertad',
    tags: ['ventas', 'caja'], status: 'RECIBIDA', appliedOn: '2026-02-01', availability: 'PART_TIME', hasVehicle: true,
    license: 'Categoría A', latestJob: 'Comercio', experienceSummary: 'Tres años', identityCard: '1.234.567-8',
    phone: '099 111 222', cvId: 5, cvFileName: 'cv.pdf', cvMeta: 'PDF · 80 KB', ...cambios,
  }
}

function diferido<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((ok) => { resolve = ok })
  return { promise, resolve }
}

describe('postulaciones recibidas para una oferta', () => {
  let router: Router

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(openCvInNewTab).mockImplementation(async (obtener) => { await obtener() })
    vi.mocked(socioApplicationsService.downloadCv).mockResolvedValue({ url: 'https://cv.test/5' })
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/ofertas', name: 'socio-mis-ofertas', component: Vacia },
        { path: '/ofertas/:offerId', name: 'socio-oferta-postulaciones', component: Vacia },
      ],
    })
    await router.push('/ofertas/3')
  })

  async function montar() {
    const wrapper = mount(SocioOfertaPostulacionesView, { global: { plugins: [router], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    return wrapper
  }

  function estado(wrapper: VueWrapper, indice: number) {
    return wrapper.findAll('.socio-application-card')[indice]!.find('select')
  }

  it('mientras carga muestra el aviso y luego las postulaciones de la oferta', async () => {
    const ofertas = diferido<JobOffer>()
    vi.mocked(offerService.get).mockReturnValueOnce(ofertas.promise)
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([
      postulacion(1), postulacion(2, { phone: null, status: 'REVISADA' }),
    ])
    const wrapper = mount(SocioOfertaPostulacionesView, { global: { plugins: [router], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    expect(wrapper.find('.shell').attributes('data-title')).toBe('Postulaciones')
    expect(wrapper.find('.shell').attributes('data-subtitle')).toBe('Cargando postulaciones...')
    expect(socioApplicationsService.list).toHaveBeenCalledWith(3)

    ofertas.resolve(oferta(3))
    await flushPromises()
    const shell = wrapper.find('.shell')
    expect(shell.attributes('data-title')).toBe('Postulaciones — Vendedor 3')
    expect(shell.attributes('data-subtitle')).toBe('2 recibidas')
    expect(shell.attributes('data-active')).toBe('ofertas')

    const tarjetas = wrapper.findAll('.socio-application-card')
    expect(tarjetas).toHaveLength(2)
    expect(tarjetas[0]!.find('h2').text()).toBe('Postulante 1')
    expect(tarjetas[0]!.text()).toContain('099 111 222')
    expect(tarjetas[0]!.findAll('li').map((li) => li.text())).toEqual(['ventas', 'caja'])
    expect(tarjetas[0]!.find('.socio-application-card__status').classes()).toContain('socio-application-card__status--recibida')
    expect(tarjetas[1]!.text()).not.toContain('099')
    expect(tarjetas[0]!.find('time').text()).toBe('2026-02-01')

    // Cada estado ofrece solo sus transiciones válidas.
    expect(estado(wrapper, 0).findAll('option').map((o) => o.text())).toEqual(['Recibida', 'Revisada', 'Descartada'])
    expect(estado(wrapper, 1).findAll('option').map((o) => o.text())).toEqual(['Revisada', 'Contactada', 'Seleccionada', 'Descartada'])
    expect(wrapper.find('.socio-applications__empty').exists()).toBe(false)
  })

  it('muestra las transiciones de los estados contactada, seleccionada y descartada', async () => {
    vi.mocked(offerService.get).mockResolvedValueOnce(oferta(3))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([
      postulacion(1, { status: 'CONTACTADA' }), postulacion(2, { status: 'SELECCIONADA' }), postulacion(3, { status: 'DESCARTADA' }),
    ])
    const wrapper = await montar()
    expect(estado(wrapper, 0).findAll('option').map((o) => o.text())).toEqual(['Contactada', 'Seleccionada', 'Descartada'])
    expect(estado(wrapper, 1).findAll('option').map((o) => o.text())).toEqual(['Seleccionada'])
    expect(estado(wrapper, 2).findAll('option').map((o) => o.text())).toEqual(['Descartada'])
  })

  it('una sola postulación usa singular y sin postulaciones muestra el vacío', async () => {
    vi.mocked(offerService.get).mockResolvedValueOnce(oferta(3))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([postulacion(1)])
    const una = await montar()
    expect(una.find('.shell').attributes('data-subtitle')).toBe('1 recibida')

    vi.mocked(offerService.get).mockResolvedValueOnce(oferta(3))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([])
    const ninguna = await montar()
    expect(ninguna.find('.shell').attributes('data-subtitle')).toBe('0 recibidas')
    expect(ninguna.find('.socio-applications__empty').text()).toBe('Todavía no hay postulaciones para esta oferta.')
  })

  it('si la oferta no existe o falla la carga lo indica y permite volver', async () => {
    vi.mocked(offerService.get).mockRejectedValueOnce(new ApiRequestError(404, '/ofertas/3', null, 'Oferta no encontrada'))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([])
    const inexistente = await montar()
    expect(inexistente.find('.shell').attributes('data-subtitle')).toBe('Oferta no encontrada')
    await inexistente.find('.acciones button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('socio-mis-ofertas')

    await router.push('/ofertas/3')
    vi.mocked(offerService.get).mockRejectedValueOnce(new Error('Sin conexión al servidor'))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([])
    const fallida = await montar()
    expect(fallida.find('.shell').attributes('data-subtitle')).toBe('Sin conexión al servidor')
    expect(fallida.text()).toContain('Sin conexión al servidor')
  })

  it('sin identificador en la ruta consulta la oferta 0 y no la encuentra', async () => {
    await router.push('/ofertas')
    vi.mocked(offerService.get).mockRejectedValueOnce(new ApiRequestError(404, '/ofertas/0', null, 'Oferta no encontrada'))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([])
    const wrapper = await montar()
    expect(offerService.get).toHaveBeenCalledWith(0)
    expect(socioApplicationsService.list).toHaveBeenCalledWith(0)
    expect(wrapper.find('.shell').attributes('data-subtitle')).toBe('Oferta no encontrada')
  })

  it('vuelve al listado de ofertas desde una oferta encontrada', async () => {
    vi.mocked(offerService.get).mockResolvedValueOnce(oferta(3))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([])
    const wrapper = await montar()
    await wrapper.find('.acciones button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('socio-mis-ofertas')
  })

  it('abre el perfil del postulante, descarga su CV y cierra el detalle', async () => {
    vi.mocked(offerService.get).mockResolvedValueOnce(oferta(3))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([
      postulacion(1),
      postulacion(2, {
        tags: [], location: null, phone: null, identityCard: null, license: null, experienceSummary: null,
        latestJob: null, cvFileName: null, cvMeta: null, cvId: null,
      }),
    ])
    const wrapper = await montar()
    const tarjetas = wrapper.findAll('.socio-application-card__main')

    await tarjetas[0]!.trigger('click')
    let modal = wrapper.findComponent(ProfileDetailModal)
    expect(modal.props('profile')).toMatchObject({
      id: '1', fullName: 'Postulante 1', phone: '099 111 222', categoryLabel: 'VENTAS', location: 'Libertad',
      identityCard: '1.234.567-8', license: 'Categoría A', experienceSummary: 'Tres años', latestJob: 'Comercio',
      cvFileName: 'cv.pdf', cvMeta: 'PDF · 80 KB', updatedAt: '2026-02-01', hasApplication: true, hasCv: true,
    })
    modal.vm.$emit('downloadCv', '1')
    await flushPromises()
    expect(socioApplicationsService.downloadCv).toHaveBeenCalledWith(1)

    vi.mocked(openCvInNewTab).mockRejectedValueOnce(new Error('Ventana emergente bloqueada'))
    modal.vm.$emit('downloadCv', '1')
    await flushPromises()
    expect(wrapper.text()).toContain('Ventana emergente bloqueada')

    modal.vm.$emit('close')
    await flushPromises()
    expect(wrapper.findComponent(ProfileDetailModal).exists()).toBe(false)

    await tarjetas[1]!.trigger('click')
    modal = wrapper.findComponent(ProfileDetailModal)
    expect(modal.props('profile')).toMatchObject({
      phone: '', categoryLabel: 'PERFIL LABORAL', location: 'San José', identityCard: '', license: 'No informada',
      experienceSummary: '', latestJob: '', cvFileName: '', cvMeta: '', hasCv: false,
    })
  })

  it('actualiza el estado de una postulación e informa errores', async () => {
    vi.mocked(offerService.get).mockResolvedValueOnce(oferta(3))
    vi.mocked(socioApplicationsService.list).mockResolvedValueOnce([postulacion(1)])
    const respuesta = diferido<{ id: number; status: ReceivedApplication['status'] }>()
    vi.mocked(socioApplicationsService.updateStatus).mockReturnValueOnce(respuesta.promise)
    const wrapper = await montar()

    // Elegir el mismo estado no llama al backend.
    await estado(wrapper, 0).trigger('change')
    expect(socioApplicationsService.updateStatus).not.toHaveBeenCalled()

    await estado(wrapper, 0).setValue('REVISADA')
    expect(socioApplicationsService.updateStatus).toHaveBeenCalledWith(1, 'REVISADA')
    expect(estado(wrapper, 0).attributes('disabled')).toBeDefined()
    respuesta.resolve({ id: 1, status: 'REVISADA' })
    await flushPromises()
    expect(estado(wrapper, 0).attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.socio-application-card__status').classes()).toContain('socio-application-card__status--revisada')
    expect(estado(wrapper, 0).findAll('option').map((o) => o.text())).toEqual(['Revisada', 'Contactada', 'Seleccionada', 'Descartada'])

    vi.mocked(socioApplicationsService.updateStatus).mockRejectedValueOnce(new Error('Estado inválido'))
    await estado(wrapper, 0).setValue('DESCARTADA')
    await flushPromises()
    expect(wrapper.text()).toContain('Estado inválido')
    expect(wrapper.find('.socio-application-card__status').classes()).toContain('socio-application-card__status--revisada')
  })
})
