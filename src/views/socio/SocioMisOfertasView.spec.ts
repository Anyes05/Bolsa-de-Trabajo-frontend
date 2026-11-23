// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import SocioMisOfertasView from './SocioMisOfertasView.vue'
import OfferFormModal from '../../components/socio/OfferFormModal.vue'
import { offerService } from '../../services/offerService'
import type { JobOffer, JobOfferPayload, RubroOption } from '../../services/types'

vi.mock('../../services/offerService', () => ({
  offerService: { list: vi.fn(), listRubros: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn() },
}))

// El layout real se reemplaza por un contenedor que expone el subtítulo y renderiza los slots.
const SocioShellStub = defineComponent({
  props: { title: String, subtitle: String, activeNav: String },
  setup(props, { slots }) {
    return () => h('div', { class: 'shell', 'data-active': props.activeNav, 'data-subtitle': props.subtitle }, [
      h('div', { class: 'acciones' }, slots['header-actions']?.()), slots.default?.(), slots.overlay?.(),
    ])
  },
})

const Vacia = defineComponent({ render: () => h('div') })
const rubros: RubroOption[] = [{ id: 1, nombreRubro: 'Ventas' }]

function oferta(id: number, estado: JobOffer['estado'], cambios: Partial<JobOffer> = {}): JobOffer {
  return {
    id, mostrarNombreEmpresa: true, socioId: 1, socioNombre: 'Mi empresa', rubroId: 1, rubro: 'Ventas',
    titulo: `Oferta ${id}`, cargo: null, descripcion: `Descripción ${id}`, requisitos: null, zona: 'Centro',
    salario: '$30.000', tipoContrato: null, disponibilidadHoraria: 'FULL_TIME', vacantes: 1,
    fechaPublicacion: '2026-01-01', fechaCierre: '2026-12-31', estado, postulaciones: 2, ...cambios,
  }
}

const payload: JobOfferPayload = {
  rubroId: 1, titulo: 'Nueva', cargo: null, descripcion: 'Desc', requisitos: null, zona: null, salario: null,
  tipoContrato: null, disponibilidadHoraria: 'FULL_TIME', vacantes: 1, fechaCierre: null, mostrarNombreEmpresa: true,
}

function diferido<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((ok) => { resolve = ok })
  return { promise, resolve }
}

describe('gestión de ofertas del socio', () => {
  let router: Router

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(offerService.listRubros).mockResolvedValue(rubros)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/ofertas', name: 'socio-mis-ofertas', component: Vacia },
        { path: '/ofertas/:offerId', name: 'socio-oferta-postulaciones', component: Vacia },
      ],
    })
    await router.push('/ofertas')
  })

  async function montar() {
    const wrapper = mount(SocioMisOfertasView, { global: { plugins: [router], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    return wrapper
  }

  function subtitulo(wrapper: VueWrapper) {
    return wrapper.find('.shell').attributes('data-subtitle')
  }

  function tarjeta(wrapper: VueWrapper, id: number) {
    return wrapper.findAll('.socio-offer-card').find((card) => card.find('h2').text() === `Oferta ${id}`)!
  }

  it('muestra la carga y luego las ofertas con sus datos', async () => {
    const pendiente = diferido<JobOffer[]>()
    vi.mocked(offerService.list).mockReturnValueOnce(pendiente.promise)
    const wrapper = mount(SocioMisOfertasView, { global: { plugins: [router], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    expect(wrapper.text()).toContain('Cargando ofertas...')
    expect(wrapper.find('.shell').attributes('data-active')).toBe('ofertas')

    pendiente.resolve([
      oferta(1, 'ACTIVA'),
      oferta(2, 'PAUSADA', { zona: null, salario: null, fechaCierre: null, mostrarNombreEmpresa: false, postulaciones: 1, disponibilidadHoraria: 'PART_TIME' }),
      oferta(3, 'CERRADA', { disponibilidadHoraria: 'INDEFINIDO' }),
      oferta(4, 'VENCIDA'),
    ])
    await flushPromises()
    expect(subtitulo(wrapper)).toBe('4 ofertas')

    const activa = tarjeta(wrapper, 1)
    expect(activa.classes()).toContain('socio-offer-card--activa')
    expect(activa.find('.socio-offer-card__status').text()).toBe('Activa')
    expect(activa.find('.socio-offer-card__meta').text()).toContain('Centro')
    expect(activa.find('.socio-offer-card__meta').text()).toContain('Tiempo completo')
    expect(activa.find('.socio-offer-card__meta').text()).toContain('$30.000')
    expect(activa.find('.socio-offer-card__apps').text()).toBe('2 postulaciones')
    expect(activa.find('.socio-offer-card__apps').attributes('href')).toBe('/ofertas/1')
    expect(activa.find('.socio-offer-card__pause').exists()).toBe(true)
    expect(activa.find('.socio-offer-card__edit').exists()).toBe(true)

    const pausada = tarjeta(wrapper, 2)
    expect(pausada.find('.socio-offer-card__status').text()).toBe('Pausada')
    const meta = pausada.find('.socio-offer-card__meta').text()
    expect(meta).toContain('Sin zona')
    expect(meta).toContain('Part-time')
    expect(meta).toContain('Indefinida')
    expect(pausada.text()).toContain('Nombre de la empresa reservado para postulantes.')
    expect(pausada.find('.socio-offer-card__apps').text()).toBe('1 postulación')
    expect(pausada.find('.socio-offer-card__resume').exists()).toBe(true)

    const cerrada = tarjeta(wrapper, 3)
    expect(cerrada.find('.socio-offer-card__status').text()).toBe('Cerrada')
    expect(cerrada.find('.socio-offer-card__meta').text()).toContain('Cualquier horario')
    expect(cerrada.findAll('.socio-offer-card__actions button')).toHaveLength(0)
    expect(tarjeta(wrapper, 4).find('.socio-offer-card__status').text()).toBe('Vencida')
  })

  it('filtra por estado y ajusta el subtítulo', async () => {
    vi.mocked(offerService.list).mockResolvedValueOnce([oferta(1, 'ACTIVA'), oferta(2, 'ACTIVA'), oferta(3, 'PAUSADA')])
    const wrapper = await montar()
    const filtros = wrapper.findAll('.cash-filter')
    expect(filtros.map((filtro) => filtro.text())).toEqual(['Todas', 'Abiertas', 'Pausada', 'Cerrada', 'Vencida'])
    expect(filtros[0]!.classes()).toContain('cash-filter--active')

    await filtros[1]!.trigger('click')
    expect(subtitulo(wrapper)).toBe('2 ofertas · Activa')
    expect(filtros[1]!.classes()).toContain('cash-filter--active')
    await filtros[2]!.trigger('click')
    expect(subtitulo(wrapper)).toBe('1 oferta · Pausada')
    await filtros[3]!.trigger('click')
    expect(subtitulo(wrapper)).toBe('0 ofertas · Cerrada')
    expect(wrapper.text()).toContain('No hay ofertas en este estado.')
    await filtros[4]!.trigger('click')
    expect(subtitulo(wrapper)).toBe('0 ofertas · Vencida')
    await filtros[0]!.trigger('click')
    expect(subtitulo(wrapper)).toBe('3 ofertas')
  })

  it('avisa cuando no hay ofertas o falla la carga', async () => {
    vi.mocked(offerService.list).mockResolvedValueOnce([])
    const vacia = await montar()
    expect(vacia.text()).toContain('No tienes ofertas laborales todavía.')

    vi.mocked(offerService.list).mockRejectedValueOnce(new Error('Servidor no disponible'))
    const fallida = await montar()
    expect(fallida.text()).not.toContain('Cargando ofertas...')
    expect(fallida.text()).toContain('Servidor no disponible')
    expect(vacia.text()).not.toContain('Servidor no disponible')
    expect(fallida.text()).toContain('No tienes ofertas laborales todavía.')
    expect(offerService.listRubros).toHaveBeenCalledTimes(2)
  })

  it('publica una oferta nueva y recarga el listado', async () => {
    vi.mocked(offerService.list).mockResolvedValueOnce([]).mockResolvedValueOnce([oferta(9, 'ACTIVA')])
    vi.mocked(offerService.create).mockResolvedValueOnce(oferta(9, 'ACTIVA'))
    const wrapper = await montar()
    expect(wrapper.findComponent(OfferFormModal).exists()).toBe(false)

    await wrapper.find('.acciones button').trigger('click')
    const modal = wrapper.findComponent(OfferFormModal)
    expect(modal.props()).toMatchObject({ mode: 'create', offer: null, sectors: rubros, adminMode: false })

    modal.vm.$emit('save', payload)
    await flushPromises()
    expect(offerService.create).toHaveBeenCalledWith(payload)
    expect(offerService.update).not.toHaveBeenCalled()
    expect(wrapper.findComponent(OfferFormModal).exists()).toBe(false)
    expect(wrapper.findAll('.socio-offer-card')).toHaveLength(1)
  })

  it('edita una oferta existente, informa errores y permite cerrar el formulario', async () => {
    const original = oferta(1, 'ACTIVA')
    vi.mocked(offerService.list).mockResolvedValue([original])
    vi.mocked(offerService.update).mockRejectedValueOnce(new Error('Título duplicado')).mockResolvedValueOnce(original)
    const wrapper = await montar()

    await tarjeta(wrapper, 1).find('.socio-offer-card__edit').trigger('click')
    let modal = wrapper.findComponent(OfferFormModal)
    expect(modal.props('mode')).toBe('edit')
    expect(modal.props('offer')).toEqual(original)
    expect(modal.props('offer')).not.toBe(original)

    modal.vm.$emit('save', payload)
    await flushPromises()
    expect(offerService.update).toHaveBeenCalledWith(1, payload)
    // Ante el error el formulario queda abierto y no se recarga el listado.
    expect(offerService.list).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Título duplicado')
    modal = wrapper.findComponent(OfferFormModal)
    expect(modal.exists()).toBe(true)

    modal.vm.$emit('save', payload)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Título duplicado')
    expect(wrapper.findComponent(OfferFormModal).exists()).toBe(false)
    expect(offerService.list).toHaveBeenCalledTimes(2)

    await tarjeta(wrapper, 1).find('.socio-offer-card__edit').trigger('click')
    wrapper.findComponent(OfferFormModal).vm.$emit('close')
    await flushPromises()
    expect(wrapper.findComponent(OfferFormModal).exists()).toBe(false)
  })

  it('pausa, reactiva y cierra ofertas, informando errores', async () => {
    vi.mocked(offerService.list).mockResolvedValueOnce([oferta(1, 'ACTIVA'), oferta(2, 'PAUSADA')])
    const wrapper = await montar()

    vi.mocked(offerService.setStatus).mockResolvedValueOnce(oferta(1, 'PAUSADA'))
    await tarjeta(wrapper, 1).find('.socio-offer-card__pause').trigger('click')
    await flushPromises()
    expect(offerService.setStatus).toHaveBeenLastCalledWith(1, 'PAUSADA')
    expect(tarjeta(wrapper, 1).find('.socio-offer-card__status').text()).toBe('Pausada')

    vi.mocked(offerService.setStatus).mockResolvedValueOnce(oferta(2, 'ACTIVA'))
    await tarjeta(wrapper, 2).find('.socio-offer-card__resume').trigger('click')
    await flushPromises()
    expect(offerService.setStatus).toHaveBeenLastCalledWith(2, 'ACTIVA')
    expect(tarjeta(wrapper, 2).find('.socio-offer-card__status').text()).toBe('Activa')

    vi.mocked(offerService.setStatus).mockResolvedValueOnce(oferta(2, 'CERRADA'))
    await tarjeta(wrapper, 2).find('.socio-offer-card__close').trigger('click')
    await flushPromises()
    expect(offerService.setStatus).toHaveBeenLastCalledWith(2, 'CERRADA')
    expect(tarjeta(wrapper, 2).find('.socio-offer-card__status').text()).toBe('Cerrada')
    expect(tarjeta(wrapper, 1).find('.socio-offer-card__status').text()).toBe('Pausada')

    vi.mocked(offerService.setStatus).mockRejectedValueOnce(new Error('Transición no permitida'))
    await tarjeta(wrapper, 1).find('.socio-offer-card__close').trigger('click')
    await flushPromises()
    // El estado de la tarjeta no cambia si el backend rechaza la transición.
    expect(offerService.setStatus).toHaveBeenLastCalledWith(1, 'CERRADA')
    expect(tarjeta(wrapper, 1).find('.socio-offer-card__status').text()).toBe('Pausada')
    expect(wrapper.text()).toContain('Transición no permitida')
  })
})
