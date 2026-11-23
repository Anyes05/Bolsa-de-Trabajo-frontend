// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import OfferFormModal from './OfferFormModal.vue'
import type { JobOffer, JobOfferPayload } from '../../services/types'

const rubros = [{ id: 1, nombreRubro: 'Ventas' }, { id: 2, nombreRubro: 'Logística' }]
const socios = [{ id: 5, razonSocial: 'Empresa Uno' }, { id: 6, razonSocial: 'Empresa Dos' }]

function oferta(cambios: Partial<JobOffer> = {}): JobOffer {
  return {
    id: 9, mostrarNombreEmpresa: false, socioId: 6, socioNombre: 'Empresa Dos', rubroId: 2, rubro: 'Logística',
    titulo: 'Chofer', cargo: 'Repartidor', descripcion: 'Reparto en zona', requisitos: 'Libreta B', zona: 'Centro',
    salario: '$30.000', tipoContrato: 'ZAFRA', disponibilidadHoraria: 'PART_TIME', vacantes: 3,
    fechaPublicacion: '2026-01-01', fechaCierre: '2030-12-31', estado: 'ACTIVA', postulaciones: 0, ...cambios,
  }
}

type Props = InstanceType<typeof OfferFormModal>['$props']

let montados: VueWrapper[] = []
function montar(props: Partial<Props> = {}) {
  const wrapper = mount(OfferFormModal, {
    props: { mode: 'create', offer: null, sectors: rubros, ...props },
    attachTo: document.body,
  })
  montados.push(wrapper)
  return wrapper
}

function guardado(wrapper: VueWrapper): JobOfferPayload {
  const eventos = wrapper.emitted('save') as JobOfferPayload[][]
  return eventos[eventos.length - 1]![0]!
}

describe('modal de oferta laboral', () => {
  afterEach(() => {
    montados.forEach((wrapper) => wrapper.unmount())
    montados = []
  })

  it('en alta parte de valores por defecto y normaliza los campos vacíos', async () => {
    const wrapper = montar()
    expect(wrapper.find('h2').text()).toBe('Publicar oferta laboral')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Publicar oferta')
    expect(wrapper.find('.offer-form__date').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Socio titular')

    await wrapper.find('input[maxlength="180"]').setValue('  Vendedor  ')
    await wrapper.find('textarea').setValue('  Atención al público  ')
    await wrapper.find('input[placeholder^="Ej."]').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(guardado(wrapper)).toEqual({
      socioId: undefined, rubroId: 0, titulo: 'Vendedor', cargo: null, descripcion: 'Atención al público',
      requisitos: null, zona: null, salario: null, tipoContrato: null, disponibilidadHoraria: 'FULL_TIME',
      vacantes: 1, fechaCierre: null, mostrarNombreEmpresa: true,
    })
  })

  it('en edición precarga la oferta y envía la fecha de cierre', async () => {
    const wrapper = montar({ mode: 'edit', offer: oferta() })
    expect(wrapper.find('h2').text()).toBe('Editar oferta laboral')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Guardar cambios')
    const fecha = wrapper.find('.offer-form__date')
    expect((fecha.element as HTMLInputElement).value).toBe('2030-12-31')
    expect(fecha.attributes('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    await wrapper.find('form').trigger('submit')
    expect(guardado(wrapper)).toEqual({
      socioId: undefined, rubroId: 2, titulo: 'Chofer', cargo: 'Repartidor', descripcion: 'Reparto en zona',
      requisitos: 'Libreta B', zona: 'Centro', salario: '$30.000', tipoContrato: 'ZAFRA',
      disponibilidadHoraria: 'PART_TIME', vacantes: 3, fechaCierre: '2030-12-31', mostrarNombreEmpresa: false,
    })

    // Al volver a "indefinida" la fecha se descarta.
    await wrapper.find('input[type="radio"][value="INDEFINIDA"]').setValue()
    await wrapper.find('form').trigger('submit')
    expect(guardado(wrapper).fechaCierre).toBeNull()
  })

  it('envía lo que el socio completa en cada campo', async () => {
    const wrapper = montar({ adminMode: true, socios })
    const selects = wrapper.findAll('select')
    await selects[0]!.setValue('6')
    await selects[1]!.setValue('1')
    await selects[2]!.setValue('INDEFINIDO')
    await selects[3]!.setValue('PASANTIA')
    const textos = wrapper.findAll('input:not([type])')
    await textos[0]!.setValue('Cajero')
    await textos[1]!.setValue(' Cajero senior ')
    await textos[2]!.setValue(' Norte ')
    await textos[3]!.setValue(' $25.000 ')
    await wrapper.find('input[type="number"]').setValue('2')
    await wrapper.find('input[type="checkbox"]').setValue(false)
    await wrapper.find('input[type="radio"][value="FECHA"]').setValue()
    await wrapper.find('.offer-form__date').setValue('2031-01-15')
    const areas = wrapper.findAll('textarea')
    await areas[0]!.setValue('Cobro en caja')
    await areas[1]!.setValue(' Secundaria completa ')
    await wrapper.find('form').trigger('submit')

    expect(guardado(wrapper)).toEqual({
      socioId: 6, rubroId: 1, titulo: 'Cajero', cargo: 'Cajero senior', descripcion: 'Cobro en caja',
      requisitos: 'Secundaria completa', zona: 'Norte', salario: '$25.000', tipoContrato: 'PASANTIA',
      disponibilidadHoraria: 'INDEFINIDO', vacantes: 2, fechaCierre: '2031-01-15', mostrarNombreEmpresa: false,
    })
  })

  it('una oferta con campos nulos usa los valores por defecto', async () => {
    const wrapper = montar({
      mode: 'edit',
      offer: oferta({ cargo: null, requisitos: null, zona: null, salario: null, tipoContrato: null, fechaCierre: null }),
    })
    expect(wrapper.find('.offer-form__date').exists()).toBe(false)
    await wrapper.find('form').trigger('submit')
    expect(guardado(wrapper)).toMatchObject({ cargo: null, requisitos: null, zona: null, salario: null, tipoContrato: null, fechaCierre: null })
  })

  it('en modo administrador elige el socio titular', async () => {
    const wrapper = montar({ adminMode: true, socios })
    expect(wrapper.text()).toContain('Socio titular')
    const selector = wrapper.find('select')
    expect(selector.findAll('option').map((option) => option.text())).toEqual(['Seleccionar socio', 'Empresa Uno', 'Empresa Dos'])
    await wrapper.find('form').trigger('submit')
    expect(guardado(wrapper).socioId).toBe(5)

    await wrapper.setProps({ offer: oferta() })
    await wrapper.find('form').trigger('submit')
    expect(guardado(wrapper).socioId).toBe(6)
  })

  it('en modo administrador sin socios deja el titular vacío', async () => {
    const wrapper = montar({ adminMode: true })
    await wrapper.find('form').trigger('submit')
    expect(guardado(wrapper).socioId).toBeNull()
  })

  it('se cierra con escape, el fondo, la cruz y cancelar', async () => {
    const wrapper = montar()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    await wrapper.find('.offer-form-modal__backdrop').trigger('click')
    await wrapper.find('.offer-form-modal__close').trigger('click')
    await wrapper.find('.offer-form__actions button[type="button"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(4)

    const quitar = vi.spyOn(window, 'removeEventListener')
    wrapper.unmount()
    montados = []
    expect(quitar).toHaveBeenCalledWith('keydown', expect.any(Function))
    quitar.mockRestore()
  })
})
