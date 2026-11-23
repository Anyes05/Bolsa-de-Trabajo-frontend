// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, type PropType } from 'vue'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import AdminOffersView from './AdminOffersView.vue'
import { offerService } from '../../services/offerService'
import type { JobOffer, JobOfferPayload } from '../../services/types'

vi.mock('../../services/offerService', () => ({
  offerService: {
    list: vi.fn(),
    listRubros: vi.fn(),
    listActiveSocios: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  },
}))

// El layout administrativo se reemplaza por un contenedor que renderiza el contenido y las acciones.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, [
      h('div', { class: 'acciones' }, slots['header-actions']?.()),
      slots.default?.(),
    ])
  },
})

// El modal real se prueba aparte: acá solo importa qué recibe y qué emite.
const OfferFormModalStub = defineComponent({
  name: 'OfferFormModal',
  props: {
    mode: String,
    offer: { type: Object as PropType<JobOffer | null>, default: null },
    adminMode: Boolean,
    sectors: Array,
    socios: Array,
  },
  emits: ['close', 'save'],
  setup(_props, { emit }) {
    return () => h('div', { class: 'modal-oferta' }, [
      h('button', { class: 'modal-cerrar', onClick: () => emit('close') }, 'Cerrar'),
      h('button', { class: 'modal-guardar', onClick: () => emit('save', payloadEjemplo) }, 'Guardar'),
    ])
  },
})

const payloadEjemplo: JobOfferPayload = {
  mostrarNombreEmpresa: true,
  socioId: 5,
  rubroId: 3,
  titulo: 'Cajero/a',
  cargo: null,
  descripcion: 'Atención en caja',
  requisitos: null,
  zona: 'San José',
  salario: null,
  tipoContrato: 'EFECTIVO',
  disponibilidadHoraria: 'FULL_TIME',
  vacantes: 1,
  fechaCierre: null,
}

function oferta(id: number, overrides: Partial<JobOffer> = {}): JobOffer {
  return {
    id,
    mostrarNombreEmpresa: true,
    socioId: 5,
    socioNombre: 'Almacén Central',
    rubroId: 3,
    rubro: 'Comercio',
    titulo: `Oferta ${id}`,
    cargo: null,
    descripcion: `Descripción ${id}`,
    requisitos: null,
    zona: null,
    salario: null,
    tipoContrato: null,
    disponibilidadHoraria: 'FULL_TIME',
    vacantes: 1,
    fechaPublicacion: '2026-11-01',
    fechaCierre: null,
    estado: 'ACTIVA',
    postulaciones: 1,
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function montar() {
  return mount(AdminOffersView, {
    global: {
      stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub, OfferFormModal: OfferFormModalStub },
    },
  })
}

function titulos(wrapper: ReturnType<typeof montar>) {
  return wrapper.findAll('.socio-offer-card h2').map((titulo) => titulo.text())
}

function cargarCatalogos(ofertas: JobOffer[]) {
  vi.mocked(offerService.list).mockResolvedValueOnce(ofertas)
  vi.mocked(offerService.listRubros).mockResolvedValueOnce([{ id: 3, nombreRubro: 'Comercio' }])
  vi.mocked(offerService.listActiveSocios).mockResolvedValueOnce([{ id: 5, razonSocial: 'Almacén Central' }])
}

describe('ofertas laborales (administración)', () => {
  beforeEach(() => {
    Object.values(offerService).forEach((fn) => vi.mocked(fn).mockReset())
  })

  it('muestra el estado de carga y luego las ofertas con sus datos', async () => {
    const lista = deferred<JobOffer[]>()
    vi.mocked(offerService.list).mockReturnValueOnce(lista.promise)
    vi.mocked(offerService.listRubros).mockResolvedValueOnce([])
    vi.mocked(offerService.listActiveSocios).mockResolvedValueOnce([])
    const wrapper = montar()
    await nextTick()
    expect(wrapper.text()).toContain('Cargando ofertas...')

    lista.resolve([
      oferta(1, { zona: 'Libertad', salario: '$ 40.000', fechaCierre: '2026-12-31', vacantes: 2, postulaciones: 3, disponibilidadHoraria: 'PART_TIME' }),
      oferta(2, { estado: 'VENCIDA', disponibilidadHoraria: 'INDEFINIDO' }),
    ])
    await flushPromises()

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe('ofertas')
    const [primera, segunda] = wrapper.findAll('.socio-offer-card')
    expect(primera!.classes()).toContain('socio-offer-card--activa')
    const meta = primera!.findAll('.socio-offer-card__meta span').map((dato) => dato.text())
    expect(meta).toEqual(['Almacén Central · Comercio', 'Libertad', 'Part-time', '$ 40.000', '2026-12-31', '2 vacantes'])
    expect(primera!.find('.socio-offer-card__status').text()).toBe('Activa')
    expect(primera!.findComponent(RouterLinkStub).props('to')).toEqual({ name: 'admin-offer-applications', params: { offerId: 1 } })
    expect(primera!.find('.socio-offer-card__apps').text()).toBe('3 postulaciones')

    expect(segunda!.classes()).toContain('socio-offer-card--cerrada')
    const metaVencida = segunda!.findAll('.socio-offer-card__meta span').map((dato) => dato.text())
    expect(metaVencida).toEqual(['Almacén Central · Comercio', 'Sin zona', 'Cualquier horario', 'Indefinida', '1 vacante'])
    expect(segunda!.find('.socio-offer-card__apps').text()).toBe('1 postulación')
    expect(segunda!.find('.socio-offer-card__status').text()).toBe('Vencida')
    // Una oferta vencida no se puede editar ni cambiar de estado.
    expect(segunda!.find('.socio-offer-card__actions button').exists()).toBe(false)
  })

  it('muestra las acciones según el estado de cada oferta', async () => {
    cargarCatalogos([
      oferta(1, { estado: 'ACTIVA' }),
      oferta(2, { estado: 'PAUSADA' }),
      oferta(3, { estado: 'CERRADA' }),
    ])
    const wrapper = montar()
    await flushPromises()
    const [activa, pausada, cerrada] = wrapper.findAll('.socio-offer-card')

    expect(activa!.find('.socio-offer-card__edit').exists()).toBe(true)
    expect(activa!.find('.socio-offer-card__pause').exists()).toBe(true)
    expect(activa!.find('.socio-offer-card__resume').exists()).toBe(false)
    expect(activa!.find('.socio-offer-card__close').exists()).toBe(true)
    expect(pausada!.find('.socio-offer-card__pause').exists()).toBe(false)
    expect(pausada!.find('.socio-offer-card__resume').exists()).toBe(true)
    expect(pausada!.find('.socio-offer-card__edit').exists()).toBe(true)
    expect(cerrada!.classes()).toContain('socio-offer-card--cerrada')
    expect(cerrada!.find('.socio-offer-card__actions button').exists()).toBe(false)
  })

  it('filtra por texto y por estado', async () => {
    cargarCatalogos([
      oferta(1, { titulo: 'Cajero', estado: 'ACTIVA' }),
      oferta(2, { titulo: 'Chofer', socioNombre: 'Transportes Sur', estado: 'PAUSADA' }),
      oferta(3, { titulo: 'Vendedor', rubro: 'Ventas', estado: 'CERRADA' }),
    ])
    const wrapper = montar()
    await flushPromises()
    expect(titulos(wrapper)).toEqual(['Cajero', 'Chofer', 'Vendedor'])

    await wrapper.find('input[type="search"]').setValue('TRANSPORTES')
    expect(titulos(wrapper)).toEqual(['Chofer'])
    await wrapper.find('input[type="search"]').setValue('ventas')
    expect(titulos(wrapper)).toEqual(['Vendedor'])
    await wrapper.find('input[type="search"]').setValue('')

    const filtros = wrapper.findAll('.cash-filter')
    expect(filtros.map((filtro) => filtro.text())).toEqual(['Todas', 'Abiertas', 'Pausada', 'Cerrada', 'Vencida'])
    await filtros[2]!.trigger('click')
    expect(filtros[2]!.classes()).toContain('cash-filter--active')
    expect(titulos(wrapper)).toEqual(['Chofer'])
    await filtros[4]!.trigger('click')
    expect(wrapper.text()).toContain('No hay ofertas para mostrar.')
    await filtros[0]!.trigger('click')
    expect(titulos(wrapper)).toHaveLength(3)
  })

  it('muestra el error si no se pueden cargar las ofertas', async () => {
    vi.mocked(offerService.list).mockRejectedValueOnce(new Error('Ofertas no disponibles'))
    vi.mocked(offerService.listRubros).mockResolvedValueOnce([])
    vi.mocked(offerService.listActiveSocios).mockResolvedValueOnce([])
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Ofertas no disponibles')
    expect(wrapper.text()).toContain('No hay ofertas para mostrar.')
  })

  it('crea una oferta nueva y recarga el listado', async () => {
    cargarCatalogos([])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.offers-publish').trigger('click')
    const modal = wrapper.findComponent(OfferFormModalStub)
    expect(modal.props('mode')).toBe('create')
    expect(modal.props('offer')).toBeNull()
    expect(modal.props('adminMode')).toBe(true)
    expect(modal.props('sectors')).toEqual([{ id: 3, nombreRubro: 'Comercio' }])
    expect(modal.props('socios')).toEqual([{ id: 5, razonSocial: 'Almacén Central' }])

    vi.mocked(offerService.create).mockResolvedValueOnce(oferta(9))
    cargarCatalogos([oferta(9, { titulo: 'Cajero/a' })])
    await wrapper.find('.modal-guardar').trigger('click')
    await flushPromises()

    expect(offerService.create).toHaveBeenCalledWith(payloadEjemplo)
    expect(offerService.update).not.toHaveBeenCalled()
    expect(wrapper.find('.modal-oferta').exists()).toBe(false)
    expect(titulos(wrapper)).toEqual(['Cajero/a'])
  })

  it('edita una oferta existente', async () => {
    const existente = oferta(4, { estado: 'PAUSADA' })
    cargarCatalogos([existente])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.socio-offer-card__edit').trigger('click')
    const modal = wrapper.findComponent(OfferFormModalStub)
    expect(modal.props('mode')).toBe('edit')
    expect(modal.props('offer')).toEqual(existente)

    vi.mocked(offerService.update).mockResolvedValueOnce(existente)
    cargarCatalogos([existente])
    await wrapper.find('.modal-guardar').trigger('click')
    await flushPromises()

    expect(offerService.update).toHaveBeenCalledWith(4, payloadEjemplo)
    expect(offerService.create).not.toHaveBeenCalled()
    expect(offerService.list).toHaveBeenCalledTimes(2)
  })

  it('cierra el modal sin guardar', async () => {
    cargarCatalogos([])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.offers-publish').trigger('click')
    await wrapper.find('.modal-cerrar').trigger('click')
    expect(wrapper.find('.modal-oferta').exists()).toBe(false)
  })

  it('mantiene el modal abierto y muestra el error si falla el guardado', async () => {
    cargarCatalogos([])
    vi.mocked(offerService.create).mockRejectedValueOnce(new Error('Datos inválidos'))
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.offers-publish').trigger('click')
    await wrapper.find('.modal-guardar').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Datos inválidos')
    expect(wrapper.find('.modal-oferta').exists()).toBe(true)
  })

  it.each([
    ['.socio-offer-card__pause', 'ACTIVA', 'PAUSADA'],
    ['.socio-offer-card__resume', 'PAUSADA', 'ACTIVA'],
    ['.socio-offer-card__close', 'ACTIVA', 'CERRADA'],
  ] as const)('cambia el estado con %s', async (selector, actual, nuevo) => {
    cargarCatalogos([oferta(7, { estado: actual })])
    vi.mocked(offerService.setStatus).mockResolvedValueOnce(oferta(7, { estado: nuevo }))
    const wrapper = montar()
    await flushPromises()

    cargarCatalogos([oferta(7, { estado: nuevo })])
    await wrapper.find(selector).trigger('click')
    await flushPromises()

    expect(offerService.setStatus).toHaveBeenCalledWith(7, nuevo)
    expect(offerService.list).toHaveBeenCalledTimes(2)
  })

  it('muestra el error si no se puede cambiar el estado', async () => {
    cargarCatalogos([oferta(7)])
    vi.mocked(offerService.setStatus).mockRejectedValueOnce(new Error('Oferta bloqueada'))
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.socio-offer-card__pause').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Oferta bloqueada')
    expect(offerService.list).toHaveBeenCalledTimes(1)
  })
})
