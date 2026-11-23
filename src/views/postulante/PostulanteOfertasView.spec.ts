// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PostulanteOfertasView from './PostulanteOfertasView.vue'
import { applicantOfferService } from '../../services/applicantOfferService'
import { postulanteService } from '../../services/postulanteService'
import type { JobOffer } from '../../services/types'
import { pageOf } from '../../test/pages'

vi.mock('../../services/applicantOfferService', () => ({
  applicantOfferService: { list: vi.fn(), listRubros: vi.fn(), listApplications: vi.fn(), apply: vi.fn() },
}))
vi.mock('../../services/postulanteService', () => ({
  postulanteService: { listProfiles: vi.fn(), listCvs: vi.fn() },
}))

const ShellStub = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })

function oferta(id: number, rubroId: number, rubro: string): JobOffer {
  return {
    id, mostrarNombreEmpresa: true, socioId: 1, socioNombre: 'Empresa', rubroId, rubro, titulo: `Oferta ${id}`,
    cargo: null, descripcion: '', requisitos: null, zona: null, salario: null, tipoContrato: null,
    disponibilidadHoraria: 'FULL_TIME', vacantes: 1, fechaPublicacion: '2026-11-01', fechaCierre: null,
    estado: 'ACTIVA', postulaciones: 0,
  }
}

const ofertas = [oferta(1, 1, 'Ventas'), oferta(2, 2, 'Logística'), oferta(3, 1, 'Ventas')]

async function montar() {
  const wrapper = mount(PostulanteOfertasView, { global: { plugins: [createPinia()], stubs: { PostulanteShell: ShellStub } } })
  await flushPromises()
  return wrapper
}

const titulos = (wrapper: Awaited<ReturnType<typeof montar>>) => wrapper.findAll('.offer-card__title').map((t) => t.text())

describe('ofertas de empleo del postulante', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    // Doble del backend (PostulanteOfertaController.page): filtra por rubro y pagina.
    vi.mocked(applicantOfferService.list).mockImplementation(async ({ rubroId = null, page = 0 } = {}) => {
      const filtradas = ofertas.filter((o) => !rubroId || o.rubroId === rubroId)
      return pageOf(filtradas.slice(page * 2, page * 2 + 2), page, 2, filtradas.length)
    })
    vi.mocked(applicantOfferService.listRubros).mockResolvedValue([{ id: 1, nombreRubro: 'Ventas' }, { id: 2, nombreRubro: 'Logística' }])
    vi.mocked(applicantOfferService.listApplications).mockResolvedValue([])
    vi.mocked(postulanteService.listProfiles).mockResolvedValue([])
    vi.mocked(postulanteService.listCvs).mockResolvedValue([])
  })

  it('pide la primera página al servidor y muestra el total', async () => {
    const wrapper = await montar()
    expect(applicantOfferService.list).toHaveBeenCalledWith({ rubroId: null, page: 0 })
    expect(titulos(wrapper)).toEqual(['Oferta 1', 'Oferta 2'])
    expect(wrapper.text()).toContain('Ofertas activas (3)')
  })

  it('envía el rubro elegido al servidor (no filtra en el navegador)', async () => {
    const wrapper = await montar()
    await wrapper.find('.postulante-offers__filter select').setValue('2')
    await flushPromises()
    expect(applicantOfferService.list).toHaveBeenLastCalledWith({ rubroId: 2, page: 0 })
    expect(titulos(wrapper)).toEqual(['Oferta 2'])
    expect(wrapper.text()).toContain('Ofertas activas (1)')
  })

  it('pagina en el servidor', async () => {
    const wrapper = await montar()
    await wrapper.find('button[aria-label="Página siguiente"]').trigger('click')
    await flushPromises()
    expect(applicantOfferService.list).toHaveBeenLastCalledWith({ rubroId: null, page: 1 })
    expect(titulos(wrapper)).toEqual(['Oferta 3'])
  })

  it('muestra el error de carga de ofertas', async () => {
    vi.mocked(applicantOfferService.list).mockReset().mockRejectedValue(new Error('Ofertas no disponibles'))
    const wrapper = await montar()
    expect(wrapper.text()).toContain('Ofertas no disponibles')
  })
})
