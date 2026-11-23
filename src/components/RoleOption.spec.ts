// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import RoleOption from './RoleOption.vue'

const IconoFalso = defineComponent({ props: { size: Number }, setup: (props) => () => h('i', { class: 'icono', 'data-size': props.size }) })

describe('opción de rol', () => {
  it('muestra título, descripción, ícono y el modificador visual', async () => {
    const wrapper = mount(RoleOption, {
      props: { title: 'SOCIO', description: 'Accede con tu BPS', icon: IconoFalso, modifier: 'role-option--member' },
    })
    const boton = wrapper.find('button')
    expect(boton.attributes('type')).toBe('button')
    expect(boton.classes()).toEqual(expect.arrayContaining(['role-option', 'role-option--member']))
    expect(wrapper.find('.role-option__text').text()).toContain('SOCIO')
    expect(wrapper.find('small').text()).toBe('Accede con tu BPS')
    expect(wrapper.find('.icono').attributes('data-size')).toBe('22')
    await boton.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
