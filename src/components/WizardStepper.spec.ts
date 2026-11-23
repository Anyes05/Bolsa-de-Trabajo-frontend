// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WizardStepper from './WizardStepper.vue'

describe('indicador de pasos del registro', () => {
  it('marca los pasos completados, el actual y los pendientes', () => {
    const wrapper = mount(WizardStepper, { props: { steps: ['Uno', 'Dos', 'Tres'], current: 2 } })
    const pasos = wrapper.findAll('li')
    expect(pasos).toHaveLength(3)
    expect(pasos[0].classes()).toContain('stepper__step--done')
    expect(pasos[0].text()).toContain('Completado:')
    expect(pasos[0].attributes('aria-current')).toBeUndefined()
    expect(pasos[1].classes()).toContain('stepper__step--active')
    expect(pasos[1].attributes('aria-current')).toBe('step')
    expect(pasos[1].find('.stepper__marker').text()).toBe('2')
    expect(pasos[2].classes()).not.toContain('stepper__step--done')
    expect(pasos[2].classes()).not.toContain('stepper__step--active')
    expect(pasos[2].find('.stepper__label').text()).toBe('Tres')
  })
})
