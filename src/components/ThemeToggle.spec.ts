// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeToggle from './ThemeToggle.vue'
import { useTheme } from '../composables/useTheme'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    useTheme().setTheme('light')
  })

  it('en modo claro ofrece pasar a oscuro y al hacer clic lo activa', async () => {
    const wrapper = mount(ThemeToggle)
    const boton = wrapper.get('button')
    expect(boton.attributes('aria-label')).toBe('Activar modo oscuro')
    expect(boton.attributes('aria-pressed')).toBe('false')

    await boton.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(boton.attributes('aria-label')).toBe('Activar modo claro')
    expect(boton.attributes('aria-pressed')).toBe('true')
    expect(boton.attributes('title')).toBe('Modo claro')
  })
})
