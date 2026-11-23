// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterGroup from './FilterGroup.vue'

const opciones = ['Todos', 'Ventas', 'Logística']

describe('grupo de filtros del socio', () => {
  it('muestra botones por defecto y marca la opción activa', async () => {
    const wrapper = mount(FilterGroup, { props: { legend: 'Rubro', options: opciones, modelValue: 'Ventas' } })
    expect(wrapper.find('legend').text()).toBe('Rubro')
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.classes()).not.toContain('filter-group--select')

    const botones = wrapper.findAll('button')
    expect(botones.map((boton) => boton.text())).toEqual(opciones)
    expect(botones[1]!.classes()).toContain('filter-group__option--active')
    expect(botones[1]!.attributes('aria-pressed')).toBe('true')
    expect(botones[0]!.attributes('aria-pressed')).toBe('false')

    await botones[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Logística']])
  })

  it('en modo select emite el valor elegido', async () => {
    const wrapper = mount(FilterGroup, {
      props: { legend: 'Disponibilidad', options: opciones, modelValue: 'Todos', variant: 'select' },
    })
    expect(wrapper.classes()).toContain('filter-group--select')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.find('.visually-hidden').text()).toBe('Disponibilidad')
    expect(wrapper.findAll('option').map((option) => option.text())).toEqual(opciones)

    await wrapper.find('select').setValue('Ventas')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Ventas']])
  })
})
