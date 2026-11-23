// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from './PasswordInput.vue'

describe('campo de contraseña', () => {
  it('aplica valores por defecto y oculta la contraseña', () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'secreta' } })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('secreta')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('autocomplete')).toBe('current-password')
    expect(input.attributes('required')).toBeUndefined()
    expect(input.attributes('minlength')).toBeUndefined()
  })

  it('pasa los atributos recibidos al input', () => {
    const wrapper = mount(PasswordInput, {
      props: {
        modelValue: '', id: 'clave', placeholder: 'Tu clave', autocomplete: 'new-password',
        required: true, disabled: true, readonly: true, minlength: 8,
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes()).toMatchObject({
      id: 'clave', placeholder: 'Tu clave', autocomplete: 'new-password', minlength: '8',
    })
    expect(input.element.required).toBe(true)
    expect(input.element.disabled).toBe(true)
    expect(input.element.readOnly).toBe(true)
  })

  it('emite el valor escrito', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('Nueva#123')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Nueva#123']])
  })

  it('alterna entre mostrar y ocultar la contraseña', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'x' } })
    const toggle = wrapper.find('button')
    expect(toggle.attributes('aria-label')).toBe('Mostrar contraseña')
    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Ocultar contraseña')
    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })
})
