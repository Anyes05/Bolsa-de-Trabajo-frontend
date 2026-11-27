// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppAlert from './AppAlert.vue'

describe('AppAlert', () => {
  it('muestra el título solo cuando se indica', () => {
    const conTitulo = mount(AppAlert, { props: { tone: 'warning', title: 'Atención' }, slots: { default: 'Texto' } })
    expect(conTitulo.find('.app-alert__title').text()).toBe('Atención')
    expect(conTitulo.classes()).toContain('app-alert--warning')

    const sinTitulo = mount(AppAlert, { slots: { default: 'Texto' } })
    expect(sinTitulo.find('.app-alert__title').exists()).toBe(false)
    expect(sinTitulo.classes()).toContain('app-alert--error')
  })
})
