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

  describe('postulación', () => {
    const perfil = { id: 11, nombre: 'Perfil Ventas', visible: true, rubros: ['Ventas'] }
    const otroPerfil = { id: 12, nombre: 'Perfil Caja', visible: true, rubros: [] as string[] }
    const oculto = { id: 13, nombre: 'Oculto', visible: false, rubros: [] as string[] }
    const cv = { id: 21, perfilLaboralId: 11, nombreArchivo: 'mi-cv.pdf' }

    async function conPerfiles(perfiles: unknown[], cvs: unknown[]) {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue(perfiles as never)
      vi.mocked(postulanteService.listCvs).mockResolvedValue(cvs as never)
      return montar()
    }

    const postularme = (wrapper: Awaited<ReturnType<typeof montar>>) =>
      wrapper.findAll('.offer-card')[0].findAll('button').find((b) => b.text() === 'Postularme')!

    it('sin perfil visible con CV avisa y no abre la selección', async () => {
      const wrapper = await conPerfiles([oculto, otroPerfil], [{ ...cv, perfilLaboralId: 13 }])
      await postularme(wrapper).trigger('click')
      expect(wrapper.text()).toContain('Para postularte necesitás al menos un perfil profesional visible con un CV')
      expect(wrapper.find('#apply-modal-title').exists()).toBe(false)
    })

    it('elige el perfil, confirma y marca la oferta como postulada', async () => {
      const wrapper = await conPerfiles([perfil, otroPerfil, oculto], [cv, { ...cv, id: 22, perfilLaboralId: 12, nombreArchivo: null }])
      const postulacion = { id: 1, ofertaId: 1, ofertaTitulo: 'Oferta 1', socioNombre: 'Empresa', rubro: 'Ventas', fecha: '2026-11-20T12:00:00Z', estado: 'RECIBIDA', perfilId: 12, perfilNombre: 'Perfil Caja', cvId: 22, cvNombre: null }
      vi.mocked(applicantOfferService.apply).mockResolvedValue(postulacion as never)
      vi.mocked(applicantOfferService.listApplications).mockResolvedValue([postulacion] as never)

      await postularme(wrapper).trigger('click')
      expect(wrapper.find('#apply-modal-title').text()).toBe('Seleccionar Perfil')
      const opciones = wrapper.findAll('.modal-profile')
      expect(opciones).toHaveLength(2)
      expect(opciones[0].text()).toContain('Ventas · mi-cv.pdf')
      expect(opciones[1].text()).toContain('Sin rubros indicados · CV del perfil')
      await opciones[1].find('input').setValue(true)
      await wrapper.findAll('button').find((b) => b.text() === 'Confirmar Postulación')!.trigger('click')
      await flushPromises()

      expect(applicantOfferService.apply).toHaveBeenCalledWith(1, 12)
      expect(wrapper.text()).toContain('Tu postulación se envió correctamente.')
      expect(wrapper.find('#apply-modal-title').exists()).toBe(false)
      expect(wrapper.findAll('.offer-card')[0].text()).toContain('Postulado')
    })

    it('si el servidor rechaza la postulación muestra el motivo', async () => {
      const wrapper = await conPerfiles([perfil], [cv])
      vi.mocked(applicantOfferService.apply).mockRejectedValue(new Error('La oferta ya no recibe postulaciones'))
      await postularme(wrapper).trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === 'Confirmar Postulación')!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('La oferta ya no recibe postulaciones')
      expect(wrapper.find('#apply-modal-title').exists()).toBe(true)
    })

    it('cancelar y el fondo cierran la selección sin postular', async () => {
      const wrapper = await conPerfiles([perfil], [cv])
      await postularme(wrapper).trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === 'Cancelar')!.trigger('click')
      expect(wrapper.find('#apply-modal-title').exists()).toBe(false)
      await postularme(wrapper).trigger('click')
      await wrapper.find('.modal__backdrop').trigger('click')
      expect(wrapper.find('#apply-modal-title').exists()).toBe(false)
      expect(applicantOfferService.apply).not.toHaveBeenCalled()
    })
  })

  it('muestra el error si falla la carga de perfiles o postulaciones', async () => {
    vi.mocked(postulanteService.listProfiles).mockRejectedValue(new Error('Perfiles no disponibles'))
    const wrapper = await montar()
    expect(wrapper.text()).toContain('Perfiles no disponibles')
  })

  it('muestra el error de carga de ofertas', async () => {
    vi.mocked(applicantOfferService.list).mockReset().mockRejectedValue(new Error('Ofertas no disponibles'))
    const wrapper = await montar()
    expect(wrapper.text()).toContain('Ofertas no disponibles')
  })
})
