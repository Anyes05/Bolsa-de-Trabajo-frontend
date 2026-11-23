// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicantFilters from './ApplicantFilters.vue'

type Props = {
  sectorOptions: string[]
  availabilityOptions: string[]
  loading: boolean
  hasFilters: boolean
  search: string
  selectedSector: string
  selectedAvailability: string
  selectedLicense: string
}

function montar(overrides: Partial<Props> = {}) {
  return mount(ApplicantFilters, {
    props: {
      sectorOptions: ['Comercio', 'Logística'],
      availabilityOptions: ['FULL_TIME', 'PART_TIME'],
      loading: false,
      hasFilters: false,
      search: '',
      selectedSector: '',
      selectedAvailability: '',
      selectedLicense: '',
      ...overrides,
    },
  })
}

describe('filtros de postulantes', () => {
  it('muestra las opciones recibidas y refleja los valores actuales', () => {
    const wrapper = montar({ search: 'ana', selectedSector: 'Logística', selectedAvailability: 'PART_TIME', selectedLicense: 'no' })
    const [rubro, disponibilidad, libreta] = wrapper.findAll('select')

    expect(wrapper.find('[role="search"]').attributes('aria-label')).toBe('Buscar y filtrar postulantes')
    expect(rubro!.findAll('option').map((opcion) => opcion.text())).toEqual(['Todos los rubros', 'Comercio', 'Logística'])
    expect(disponibilidad!.findAll('option').map((opcion) => opcion.text())).toEqual(['Todas las disponibilidades', 'FULL_TIME', 'PART_TIME'])
    expect(libreta!.findAll('option').map((opcion) => opcion.text())).toEqual(['Todos', 'Tiene libreta', 'No tiene libreta'])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('ana')
    expect((rubro!.element as HTMLSelectElement).value).toBe('Logística')
    expect((disponibilidad!.element as HTMLSelectElement).value).toBe('PART_TIME')
    expect((libreta!.element as HTMLSelectElement).value).toBe('no')
  })

  it('deshabilita los selectores mientras carga y el botón de limpiar sin filtros', () => {
    const wrapper = montar({ loading: true })

    expect(wrapper.findAll('select').every((select) => select.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('emite las actualizaciones de cada modelo', async () => {
    const wrapper = montar()
    const [rubro, disponibilidad, libreta] = wrapper.findAll('select')

    await wrapper.find('input').setValue('bruno')
    await rubro!.setValue('Comercio')
    await disponibilidad!.setValue('FULL_TIME')
    await libreta!.setValue('yes')

    expect(wrapper.emitted('update:search')).toEqual([['bruno']])
    expect(wrapper.emitted('update:selectedSector')).toEqual([['Comercio']])
    expect(wrapper.emitted('update:selectedAvailability')).toEqual([['FULL_TIME']])
    expect(wrapper.emitted('update:selectedLicense')).toEqual([['yes']])
  })

  it('emite clear al limpiar cuando hay filtros activos', async () => {
    const wrapper = montar({ hasFilters: true })

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})
